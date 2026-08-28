import { runSupabaseQuery, supabaseConfigured } from "./integrations/supabase";

// Termos de uso, um texto por sistema. Editável pelo Central; o cliente
// precisa aceitar no primeiro acesso (ver /primeiro-acesso/[token]).
// Fica salvo no schema `central` do Supabase compartilhado.

export type TermoUso = { sistemaId: string; texto: string; atualizadoEm: string | null };

async function ref(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const sistemas = await (await import("./data")).getSistemas();
  return sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;
}

async function ensure(r: string) {
  await runSupabaseQuery(r, `
    create schema if not exists central;
    create table if not exists central.termos_uso (
      sistema_id text primary key,
      texto text not null default '',
      atualizado_em timestamptz not null default now()
    );`);
}

export async function listarTermos(): Promise<Record<string, TermoUso>> {
  const r = await ref();
  if (!r) return {};
  await ensure(r);
  const rows = await runSupabaseQuery(r, `select sistema_id, texto, atualizado_em from central.termos_uso;`);
  const out: Record<string, TermoUso> = {};
  for (const row of rows || []) {
    out[String(row.sistema_id)] = { sistemaId: String(row.sistema_id), texto: String(row.texto || ""), atualizadoEm: row.atualizado_em };
  }
  return out;
}

export async function getTermo(sistemaId: string): Promise<string> {
  const r = await ref();
  if (!r) return "";
  await ensure(r);
  const idSafe = sistemaId.replace(/[^a-z0-9_-]/gi, "");
  const rows = await runSupabaseQuery(r, `select texto from central.termos_uso where sistema_id = '${idSafe}';`);
  return rows && rows[0] ? String(rows[0].texto || "") : "";
}

export async function salvarTermo(sistemaId: string, texto: string): Promise<{ ok: boolean; erro?: string }> {
  const r = await ref();
  if (!r) return { ok: false, erro: "Supabase não configurado." };
  if (!sistemaId) return { ok: false, erro: "Informe o sistema." };
  await ensure(r);
  const idSafe = sistemaId.replace(/[^a-z0-9_-]/gi, "");
  const textoSafe = (texto || "").replace(/'/g, "''");
  const res = await runSupabaseQuery(r, `
    insert into central.termos_uso (sistema_id, texto, atualizado_em)
    values ('${idSafe}', '${textoSafe}', now())
    on conflict (sistema_id) do update set texto = excluded.texto, atualizado_em = now();`);
  return res !== null ? { ok: true } : { ok: false, erro: "Não foi possível salvar." };
}
