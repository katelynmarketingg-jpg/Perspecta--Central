import { unstable_cache } from "next/cache";
import { runSupabaseQuery, supabaseConfigured } from "./integrations/supabase";

// Detalhes editáveis de cada sistema (visão da dona): limite de armazenamento
// "comprado", custo por GB, e o token que o sistema usa (se expira e quando).
// A Katelyn edita pela aba Sistemas; fica salvo em central.sistema_detalhes.

export type SistemaDetalhe = {
  sistemaId: string;
  limiteGb: number | null;        // quanto de armazenamento está disponível (comprado)
  custoPorGbBrl: number | null;   // quanto custa cada GB/mês (R$)
  tokenNome: string | null;       // ex.: "SUPABASE_MANAGEMENT_TOKEN"
  tokenExpira: boolean;           // true = expira; false = vitalício
  tokenExpiraEm: string | null;   // data (YYYY-MM-DD) quando expira
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
    );`);
}

function fromRow(x: any): SistemaDetalhe {
  return {
    sistemaId: String(x.sistema_id),
    limiteGb: x.limite_gb != null ? Number(x.limite_gb) : null,
    custoPorGbBrl: x.custo_por_gb_brl != null ? Number(x.custo_por_gb_brl) : null,
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
  const rows = await runSupabaseQuery(r, `select sistema_id, limite_gb, custo_por_gb_brl, token_nome, token_expira, token_expira_em, atualizado_em from central.sistema_detalhes;`);
  const out: Record<string, SistemaDetalhe> = {};
  for (const x of rows || []) { const d = fromRow(x); out[d.sistemaId] = d; }
  return out;
}
export const listarDetalhes = unstable_cache(_listarDetalhes, ["sistema-detalhes-v1"], { revalidate: 300, tags: ["sistemas-detalhes"] });

export async function salvarDetalhe(input: {
  sistemaId: string; limiteGb?: number | null; custoPorGbBrl?: number | null;
  tokenNome?: string | null; tokenExpira?: boolean; tokenExpiraEm?: string | null;
}): Promise<{ ok: boolean; erro?: string }> {
  const r = await ref();
  if (!r) return { ok: false, erro: "Supabase não configurado." };
  const sid = (input.sistemaId || "").replace(/[^a-z0-9_-]/gi, "");
  if (!sid) return { ok: false, erro: "Sistema inválido." };
  await ensure(r);
  const num = (v: number | null | undefined) => (v == null || !Number.isFinite(Number(v)) ? "null" : String(Number(v)));
  const txt = (v: string | null | undefined) => (v == null || v === "" ? "null" : `'${String(v).replace(/'/g, "''").slice(0, 120)}'`);
  const data = input.tokenExpiraEm && /^\d{4}-\d{2}-\d{2}$/.test(input.tokenExpiraEm) ? `'${input.tokenExpiraEm}'` : "null";
  const expira = input.tokenExpira ? "true" : "false";
  const res = await runSupabaseQuery(r, `
    insert into central.sistema_detalhes (sistema_id, limite_gb, custo_por_gb_brl, token_nome, token_expira, token_expira_em, atualizado_em)
    values ('${sid}', ${num(input.limiteGb)}, ${num(input.custoPorGbBrl)}, ${txt(input.tokenNome)}, ${expira}, ${data}, now())
    on conflict (sistema_id) do update set
      limite_gb = excluded.limite_gb,
      custo_por_gb_brl = excluded.custo_por_gb_brl,
      token_nome = excluded.token_nome,
      token_expira = excluded.token_expira,
      token_expira_em = excluded.token_expira_em,
      atualizado_em = now();`);
  return res !== null ? { ok: true } : { ok: false, erro: "Não foi possível salvar." };
}
