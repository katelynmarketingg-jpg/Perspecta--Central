import { createHmac, timingSafeEqual } from "crypto";
import { runSupabaseQuery, supabaseConfigured } from "./integrations/supabase";

// Recebimento de eventos dos outros sistemas Perspecta (contrato documentado
// em app/api/webhooks/[sistema]/route.ts). Cada sistema tem seu próprio
// segredo (central.sistemas.webhook_secret) usado pra assinar o corpo em
// HMAC-SHA256 — evita que qualquer um chame o endpoint fingindo ser o sistema.

async function ref(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const sistemas = await (await import("./data")).getSistemas();
  return sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;
}

export async function getWebhookSecret(sistemaId: string): Promise<string | null> {
  const r = await ref();
  if (!r) return null;
  const sid = sistemaId.replace(/[^a-z0-9_-]/gi, "");
  const rows = await runSupabaseQuery(r, `select webhook_secret from central.sistemas where id = '${sid}';`);
  return rows?.[0]?.webhook_secret || null;
}

// Compara em tempo constante — evita vazar quanto da assinatura bateu por timing.
export function assinaturaValida(corpoRaw: string, assinatura: string | null, segredo: string): boolean {
  if (!assinatura) return false;
  const esperado = createHmac("sha256", segredo).update(corpoRaw).digest("hex");
  const a = Buffer.from(assinatura.replace(/^sha256=/, ""));
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type TipoEvento = "login.novo" | "cadastro.novo" | "pagamento.confirmado" | "limite.atingido" | "acesso.suspeito" | "suporte.mensagem";

// Registra o evento com idempotência: se a idempotency_key já existir, não
// reprocessa (devolve duplicado:true) — protege contra retry do lado do sistema-cliente.
export async function registrarEvento(sistemaId: string, tipo: string, payload: any, idempotencyKey: string, assinaturaValida: boolean): Promise<{ ok: boolean; duplicado?: boolean }> {
  const r = await ref();
  if (!r) return { ok: false };
  const sid = sistemaId.replace(/'/g, "''");
  const t = tipo.replace(/'/g, "''");
  const key = idempotencyKey.replace(/'/g, "''");
  const json = JSON.stringify(payload || {}).replace(/'/g, "''");
  const res = await runSupabaseQuery(
    r,
    `insert into central.webhook_eventos (sistema_id, tipo, payload, idempotency_key, assinatura_valida)
     values ('${sid}', '${t}', '${json}'::jsonb, '${key}', ${assinaturaValida})
     on conflict (idempotency_key) do nothing
     returning id;`
  );
  if (res === null) return { ok: false };
  return { ok: true, duplicado: res.length === 0 };
}

export async function marcarProcessado(idempotencyKey: string, erro?: string): Promise<void> {
  const r = await ref();
  if (!r) return;
  const key = idempotencyKey.replace(/'/g, "''");
  const erroSql = erro ? `'${erro.replace(/'/g, "''").slice(0, 500)}'` : "null";
  await runSupabaseQuery(r, `update central.webhook_eventos set processado_em = now(), erro = ${erroSql} where idempotency_key = '${key}';`);
}

// Aplica o efeito de cada tipo de evento nas tabelas reais do Central.
export async function processarEvento(sistemaId: string, tipo: string, dados: any): Promise<{ ok: boolean; erro?: string }> {
  const r = await ref();
  if (!r) return { ok: false, erro: "Supabase não configurado." };
  const sid = sistemaId.replace(/'/g, "''");
  const esc = (s: any) => String(s ?? "").replace(/'/g, "''");

  try {
    if (tipo === "login.novo") {
      const resultado = dados?.resultado === "falha" ? "falha" : "sucesso";
      await runSupabaseQuery(r, `insert into central.login_attempts (sistema_id, empresa_ref, usuario_external_id, usuario_email, resultado, motivo, ip, device_fingerprint)
        values ('${sid}', ${dados?.empresa_ref ? `'${esc(dados.empresa_ref)}'` : "null"}, ${dados?.usuario_id ? `'${esc(dados.usuario_id)}'` : "null"}, ${dados?.email ? `'${esc(dados.email)}'` : "null"}, '${resultado}', ${dados?.motivo ? `'${esc(dados.motivo)}'` : "null"}, ${dados?.ip ? `'${esc(dados.ip)}'` : "null"}, ${dados?.device_fingerprint ? `'${esc(dados.device_fingerprint)}'` : "null"});`);
      return { ok: true };
    }
    if (tipo === "limite.atingido" || tipo === "acesso.suspeito") {
      await runSupabaseQuery(r, `insert into central.alertas (tipo, severidade, sistema_id, titulo, detalhe)
        values ('${tipo}', ${tipo === "acesso.suspeito" ? "'alta'" : "'media'"}, '${sid}', ${dados?.titulo ? `'${esc(dados.titulo)}'` : `'${tipo}'`}, '${esc(JSON.stringify(dados || {}))}'::jsonb);`);
      return { ok: true };
    }
    if (tipo === "suporte.mensagem") {
      const rows = await runSupabaseQuery(r, `insert into central.tickets_suporte (sistema_id, usuario_external_id, assunto, external_ticket_ref)
        values ('${sid}', ${dados?.usuario_id ? `'${esc(dados.usuario_id)}'` : "null"}, ${dados?.assunto ? `'${esc(dados.assunto)}'` : "'Sem assunto'"}, ${dados?.ticket_ref ? `'${esc(dados.ticket_ref)}'` : "null"})
        returning id;`);
      const ticketId = rows?.[0]?.id;
      if (ticketId && dados?.mensagem) {
        await runSupabaseQuery(r, `insert into central.mensagens_ticket (ticket_id, autor_tipo, corpo) values ('${ticketId}', 'cliente', '${esc(dados.mensagem)}');`);
      }
      return { ok: true };
    }
    if (tipo === "cadastro.novo" || tipo === "pagamento.confirmado") {
      // Fica registrado no log de eventos (auditoria); ligação com central.empresas
      // entra quando o catálogo de planos migrar de vez (mesma ressalva de antes).
      return { ok: true };
    }
    return { ok: false, erro: `tipo de evento desconhecido: ${tipo}` };
  } catch (e: any) {
    return { ok: false, erro: e?.message || "erro ao processar" };
  }
}
