import { unstable_cache } from "next/cache";
import { runSupabaseQuery, supabaseConfigured } from "./integrations/supabase";

// Detalhes editáveis de cada sistema (visão da dona): limite de armazenamento
// "comprado", custo por GB, e o token que o sistema usa (se expira e quando).
// A Katelyn edita pela aba Sistemas; fica salvo em central.sistema_detalhes.

export type SistemaDetalhe = {
  sistemaId: string;
  limiteGb: number | null;            // quanto de armazenamento está disponível (comprado)
  custoPorGbBrl: number | null;       // preço por GB COBRADO do cliente (R$)
  custoRealPorGbBrl: number | null;   // quanto cada GB custa PRA VOCÊ (pago ao provedor)
  tokenNome: string | null;           // ex.: "SUPABASE_MANAGEMENT_TOKEN"
  tokenExpira: boolean;               // true = expira; false = vitalício
  tokenExpiraEm: string | null;       // data (YYYY-MM-DD) quando expira
  atualizadoEm: string | null;
};

async function ref(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const sistemas = await (await import("./data")).getSistemas();
  return sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;
}

async function ensure(r: string) {
  await runSupabaseQuery(r, `
    create schema if not exists central;
    create table if not exists central.sistema_detalhes (
      sistema_id text primary key,
      limite_gb numeric,
      custo_por_gb_brl numeric,
      token_nome text,
      token_expira boolean not null default false,
      token_expira_em date,
      atualizado_em timestamptz not null default now()
    );
    alter table central.sistema_detalhes add column if not exists custo_real_por_gb_brl numeric;`);
}

function fromRow(x: any): SistemaDetalhe {
  return {
    sistemaId: String(x.sistema_id),
    limiteGb: x.limite_gb != null ? Number(x.limite_gb) : null,
    custoPorGbBrl: x.custo_por_gb_brl != null ? Number(x.custo_por_gb_brl) : null,
    custoRealPorGbBrl: x.custo_real_por_gb_brl != null ? Number(x.custo_real_por_gb_brl) : null,
    tokenNome: x.token_nome ?? null,
    tokenExpira: Boolean(x.token_expira),
    tokenExpiraEm: x.token_expira_em ? String(x.token_expira_em).slice(0, 10) : null,
    atualizadoEm: x.atualizado_em ?? null,
  };
}

async function _listarDetalhes(): Promise<Record<string, SistemaDetalhe>> {
  const r = await ref();
  if (!r) return {};
  await ensure(r);
  const rows = await runSupabaseQuery(r, `select sistema_id, limite_gb, custo_por_gb_brl, custo_real_por_gb_brl, token_nome, token_expira, token_expira_em, atualizado_em from central.sistema_detalhes;`);
  const out: Record<string, SistemaDetalhe> = {};
  for (const x of rows || []) { const d = fromRow(x); out[d.sistemaId] = d; }
  return out;
}
export const listarDetalhes = unstable_cache(_listarDetalhes, ["sistema-detalhes-v1"], { revalidate: 300, tags: ["sistemas-detalhes"] });

// ——— Limite de armazenamento POR EMPRESA (a dona define por cliente) ———
async function ensureLimites(r: string) {
  await runSupabaseQuery(r, `
    create schema if not exists central;
    create table if not exists central.empresa_limites (
      sistema_id text not null,
      empresa_ref text not null,
      limite_gb numeric,
      atualizado_em timestamptz not null default now(),
      primary key (sistema_id, empresa_ref)
    );`);
}

// Mapa keyed "sistema::empresa" -> limite em GB.
async function _listarLimitesEmpresa(): Promise<Record<string, number>> {
  const r = await ref();
  if (!r) return {};
  await ensureLimites(r);
  const rows = await runSupabaseQuery(r, `select sistema_id, empresa_ref, limite_gb from central.empresa_limites where limite_gb is not null;`);
  const out: Record<string, number> = {};
  for (const x of rows || []) out[`${x.sistema_id}::${x.empresa_ref}`] = Number(x.limite_gb) || 0;
  return out;
}
export const listarLimitesEmpresa = unstable_cache(_listarLimitesEmpresa, ["empresa-limites-v1"], { revalidate: 300, tags: ["sistemas-detalhes"] });

export async function salvarLimiteEmpresa(sistemaId: string, empresaRef: string, limiteGb: number | null): Promise<{ ok: boolean; erro?: string }> {
  const r = await ref();
  if (!r) return { ok: false, erro: "Supabase não configurado." };
  const sid = (sistemaId || "").replace(/[^a-z0-9_-]/gi, "");
  const emp = String(empresaRef || "").replace(/'/g, "''").slice(0, 160);
  if (!sid || !emp) return { ok: false, erro: "Sistema/empresa inválidos." };
  await ensureLimites(r);
  const val = limiteGb == null || !Number.isFinite(Number(limiteGb)) ? "null" : String(Number(limiteGb));
  const res = await runSupabaseQuery(r, `
    insert into central.empresa_limites (sistema_id, empresa_ref, limite_gb, atualizado_em)
    values ('${sid}', '${emp}', ${val}, now())
    on conflict (sistema_id, empresa_ref) do update set limite_gb = excluded.limite_gb, atualizado_em = now();`);
  return res !== null ? { ok: true } : { ok: false, erro: "Não foi possível salvar." };
}

export async function salvarDetalhe(input: {
  sistemaId: string; limiteGb?: number | null; custoPorGbBrl?: number | null; custoRealPorGbBrl?: number | null;
  tokenNome?: string | null; tokenExpira?: boolean; tokenExpiraEm?: string | null;
}): Promise<{ ok: boolean; erro?: string }> {
  const r = await ref();
  if (!r) return { ok: false, erro: "Supabase não configurado." };
  const sid = (input.sistemaId || "").replace(/[^a-z0-9_-]/gi, "");
  if (!sid) return { ok: false, erro: "Sistema inválido." };
  await ensure(r);
  const num = (v: number | null | undefined) => (v == null || !Number.isFinite(Number(v)) ? "null" : String(Number(v)));
  const txt = (v: string | null | undefined) => (v == null || v === "" ? "null" : `'${String(v).replace(/'/g, "''").slice(0, 120)}'`);
  // Atualização PARCIAL: só mexe nas colunas que vieram no input — assim salvar
  // o armazenamento não apaga o token, e vice-versa.
  const has = (k: string) => Object.prototype.hasOwnProperty.call(input, k);
  const cols: string[] = []; const vals: string[] = []; const sets: string[] = [];
  const add = (col: string, sqlVal: string) => { cols.push(col); vals.push(sqlVal); sets.push(`${col} = excluded.${col}`); };
  if (has("limiteGb")) add("limite_gb", num(input.limiteGb));
  if (has("custoPorGbBrl")) add("custo_por_gb_brl", num(input.custoPorGbBrl));
  if (has("custoRealPorGbBrl")) add("custo_real_por_gb_brl", num(input.custoRealPorGbBrl));
  if (has("tokenNome")) add("token_nome", txt(input.tokenNome));
  if (has("tokenExpira")) add("token_expira", input.tokenExpira ? "true" : "false");
  if (has("tokenExpiraEm")) add("token_expira_em", input.tokenExpiraEm && /^\d{4}-\d{2}-\d{2}$/.test(input.tokenExpiraEm) ? `'${input.tokenExpiraEm}'` : "null");
  if (cols.length === 0) return { ok: true };
  const res = await runSupabaseQuery(r, `
    insert into central.sistema_detalhes (sistema_id, ${cols.join(", ")}, atualizado_em)
    values ('${sid}', ${vals.join(", ")}, now())
    on conflict (sistema_id) do update set ${sets.join(", ")}, atualizado_em = now();`);
  return res !== null ? { ok: true } : { ok: false, erro: "Não foi possível salvar." };
}
