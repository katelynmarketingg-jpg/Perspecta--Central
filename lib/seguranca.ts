import { runSupabaseQuery, supabaseConfigured } from "./integrations/supabase";

// Segurança real: lê os alertas e tentativas de login que os webhooks dos
// sistemas (Creator, Commerce, ...) já estão gravando em central.alertas e
// central.login_attempts — em vez de inventar dado.

async function ref(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const sistemas = await (await import("./data")).getSistemas();
  return sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;
}

export type AlertaReal = {
  id: string; tipo: string; severidade: string; sistemaId: string | null;
  titulo: string; detalhe: any; status: string; criadoEm: string;
};

export async function listarAlertasReais(): Promise<AlertaReal[]> {
  const r = await ref();
  if (!r) return [];
  const rows = await runSupabaseQuery(r, `select id, tipo, severidade, sistema_id, titulo, detalhe, status, criado_em from central.alertas where status = 'aberto' order by criado_em desc limit 50;`);
  return (rows || []).map((x: any) => ({
    id: String(x.id), tipo: String(x.tipo), severidade: x.severidade || "media", sistemaId: x.sistema_id ?? null,
    titulo: x.titulo || x.tipo, detalhe: x.detalhe, status: x.status, criadoEm: x.criado_em,
  }));
}

export type LoginSuspeito = {
  sistemaId: string; empresaRef: string | null; usuarioEmail: string | null;
  ipsDistintos: number; tentativas: number; ultimoAcesso: string;
};

// Mesma empresa/usuário, mais de um IP distinto nas últimas 24h → acesso
// possivelmente de mais de um dispositivo (proxy simples, sem depender de
// fingerprint — nem todo sistema manda esse campo ainda).
export async function detectarAcessoMultiploDispositivo(): Promise<LoginSuspeito[]> {
  const r = await ref();
  if (!r) return [];
  const rows = await runSupabaseQuery(
    r,
    `select sistema_id, empresa_ref, usuario_email, count(distinct ip) as ips, count(*) as tentativas, max(quando) as ultimo
     from central.login_attempts
     where resultado = 'sucesso' and quando > now() - interval '24 hours' and ip is not null
     group by sistema_id, empresa_ref, usuario_email
     having count(distinct ip) > 1
     order by ips desc
     limit 30;`
  );
  return (rows || []).map((x: any) => ({
    sistemaId: String(x.sistema_id), empresaRef: x.empresa_ref, usuarioEmail: x.usuario_email,
    ipsDistintos: Number(x.ips) || 0, tentativas: Number(x.tentativas) || 0, ultimoAcesso: x.ultimo,
  }));
}

export type ResumoLogins = { sistemaId: string; sucessos24h: number; falhas24h: number };

export async function resumoLoginsPorSistema(): Promise<ResumoLogins[]> {
  const r = await ref();
  if (!r) return [];
  const rows = await runSupabaseQuery(
    r,
    `select sistema_id,
       count(*) filter (where resultado = 'sucesso') as sucessos,
       count(*) filter (where resultado = 'falha') as falhas
     from central.login_attempts
     where quando > now() - interval '24 hours'
     group by sistema_id;`
  );
  return (rows || []).map((x: any) => ({ sistemaId: String(x.sistema_id), sucessos24h: Number(x.sucessos) || 0, falhas24h: Number(x.falhas) || 0 }));
}
