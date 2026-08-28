import { runSupabaseQuery, supabaseConfigured } from "./integrations/supabase";

// Custos que a Perspecta adiciona à mão (ex.: uma ferramenta, um domínio),
// aplicáveis a todos os sistemas ou a um só. Ficam salvos no schema `central`
// do Supabase compartilhado. Entram no custo total e no rateio por empresa.

export type CustoManual = { id: string; nome: string; valorBrl: number; sistemaId: string | null; criadoEm?: string };

async function ref(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const sistemas = await (await import("./data")).getSistemas();
  return sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;
}

async function ensure(r: string) {
  await runSupabaseQuery(r, `
    create schema if not exists central;
    create table if not exists central.custos_manuais (
      id uuid primary key default gen_random_uuid(),
      nome text not null,
      valor_brl numeric not null default 0,
      sistema_id text,
      criado_em timestamptz not null default now()
    );`);
}

export async function listarCustosManuais(): Promise<CustoManual[]> {
  const r = await ref();
  if (!r) return [];
  await ensure(r);
  const rows = await runSupabaseQuery(r, `select id, nome, valor_brl, sistema_id, criado_em from central.custos_manuais order by criado_em;`);
  return (rows || []).map((x: any) => ({
    id: String(x.id), nome: String(x.nome), valorBrl: Number(x.valor_brl) || 0,
    sistemaId: x.sistema_id ?? null, criadoEm: x.criado_em,
  }));
}

export async function addCustoManual(nome: string, valorBrl: number, sistemaId: string | null): Promise<{ ok: boolean; erro?: string }> {
  const r = await ref();
  if (!r) return { ok: false, erro: "Supabase não configurado." };
  if (!nome?.trim()) return { ok: false, erro: "Informe o nome do custo." };
  await ensure(r);
  const nomeSafe = nome.trim().slice(0, 120).replace(/'/g, "''");
  const val = Number(valorBrl) || 0;
  const sisSafe = sistemaId ? `'${sistemaId.replace(/[^a-z0-9_-]/gi, "")}'` : "null";
  const res = await runSupabaseQuery(r, `insert into central.custos_manuais (nome, valor_brl, sistema_id) values ('${nomeSafe}', ${val}, ${sisSafe});`);
  return res !== null ? { ok: true } : { ok: false, erro: "Não foi possível salvar." };
}

export async function updateCustoManual(id: string, nome: string, valorBrl: number, sistemaId: string | null): Promise<{ ok: boolean; erro?: string }> {
  const r = await ref();
  if (!r) return { ok: false, erro: "Supabase não configurado." };
  if (!nome?.trim()) return { ok: false, erro: "Informe o nome do custo." };
  const idSafe = id.replace(/[^a-f0-9-]/gi, "");
  const nomeSafe = nome.trim().slice(0, 120).replace(/'/g, "''");
  const val = Number(valorBrl) || 0;
  const sisSafe = sistemaId ? `'${sistemaId.replace(/[^a-z0-9_-]/gi, "")}'` : "null";
  const res = await runSupabaseQuery(r, `update central.custos_manuais set nome='${nomeSafe}', valor_brl=${val}, sistema_id=${sisSafe} where id='${idSafe}';`);
  return res !== null ? { ok: true } : { ok: false, erro: "Não foi possível atualizar." };
}

export async function removerCustoManual(id: string): Promise<{ ok: boolean }> {
  const r = await ref();
  if (!r) return { ok: false };
  const idSafe = id.replace(/[^a-f0-9-]/gi, "");
  const res = await runSupabaseQuery(r, `delete from central.custos_manuais where id = '${idSafe}';`);
  return { ok: res !== null };
}
