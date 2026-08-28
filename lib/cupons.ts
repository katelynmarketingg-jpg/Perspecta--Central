import { runSupabaseQuery, supabaseConfigured } from "./integrations/supabase";

// Cupons de desconto da Perspecta (ex.: −R$100, ou −20%). Salvos no schema
// `central` do Supabase. Usados no simulador e, depois, no checkout.

export type Cupom = { id: string; codigo: string; tipo: "valor" | "percent"; valor: number; descricao: string | null; ativo: boolean };

async function ref(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const sistemas = await (await import("./data")).getSistemas();
  return sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;
}

async function ensure(r: string) {
  await runSupabaseQuery(r, `
    create schema if not exists central;
    create table if not exists central.cupons (
      id uuid primary key default gen_random_uuid(),
      codigo text not null,
      tipo text not null default 'valor',
      valor numeric not null default 0,
      descricao text,
      ativo boolean not null default true,
      criado_em timestamptz not null default now()
    );`);
}

export async function listarCupons(): Promise<Cupom[]> {
  const r = await ref();
  if (!r) return [];
  await ensure(r);
  const rows = await runSupabaseQuery(r, `select id, codigo, tipo, valor, descricao, ativo from central.cupons order by criado_em;`);
  return (rows || []).map((x: any) => ({
    id: String(x.id), codigo: String(x.codigo), tipo: x.tipo === "percent" ? "percent" : "valor",
    valor: Number(x.valor) || 0, descricao: x.descricao ?? null, ativo: x.ativo !== false,
  }));
}

export async function addCupom(codigo: string, tipo: "valor" | "percent", valor: number, descricao: string): Promise<{ ok: boolean; erro?: string }> {
  const r = await ref();
  if (!r) return { ok: false, erro: "Supabase não configurado." };
  if (!codigo?.trim()) return { ok: false, erro: "Informe o código do cupom." };
  await ensure(r);
  const cod = codigo.trim().slice(0, 40).replace(/'/g, "''");
  const desc = (descricao || "").slice(0, 120).replace(/'/g, "''");
  const t = tipo === "percent" ? "percent" : "valor";
  const val = Number(valor) || 0;
  const res = await runSupabaseQuery(r, `insert into central.cupons (codigo, tipo, valor, descricao) values ('${cod}', '${t}', ${val}, '${desc}');`);
  return res !== null ? { ok: true } : { ok: false, erro: "Não foi possível salvar." };
}

export async function removerCupom(id: string): Promise<{ ok: boolean }> {
  const r = await ref();
  if (!r) return { ok: false };
  const idSafe = id.replace(/[^a-f0-9-]/gi, "");
  const res = await runSupabaseQuery(r, `delete from central.cupons where id = '${idSafe}';`);
  return { ok: res !== null };
}

// Aplica um cupom a um preço.
export function aplicarCupom(preco: number, cupom?: Cupom | null): number {
  if (!cupom) return preco;
  const p = cupom.tipo === "percent" ? preco * (1 - cupom.valor / 100) : preco - cupom.valor;
  return Math.max(0, Math.round(p * 100) / 100);
}
