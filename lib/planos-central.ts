import { runSupabaseQuery, supabaseConfigured } from "./integrations/supabase";

// Planos que a Perspecta cria para cada sistema. Salvos no schema `central`.
export type PlanoCentral = {
  id: string; sistemaId: string; nome: string;
  logins: number; gb: number; produtos: number | null; preco: number;
};

async function ref(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const sistemas = await (await import("./data")).getSistemas();
  return sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;
}

async function ensure(r: string) {
  await runSupabaseQuery(r, `
    create schema if not exists central;
    create table if not exists central.planos (
      id uuid primary key default gen_random_uuid(),
      sistema_id text not null,
      nome text not null,
      logins integer not null default 0,
      gb numeric not null default 0,
      produtos integer,
      preco numeric not null default 0,
      criado_em timestamptz not null default now()
    );`);
}

export async function listarPlanosCentral(): Promise<PlanoCentral[]> {
  const r = await ref();
  if (!r) return [];
  await ensure(r);
  const rows = await runSupabaseQuery(r, `select id, sistema_id, nome, logins, gb, produtos, preco from central.planos order by sistema_id, preco;`);
  return (rows || []).map((x: any) => ({
    id: String(x.id), sistemaId: String(x.sistema_id), nome: String(x.nome),
    logins: Number(x.logins) || 0, gb: Number(x.gb) || 0,
    produtos: x.produtos == null ? null : Number(x.produtos), preco: Number(x.preco) || 0,
  }));
}

export async function addPlanoCentral(p: { sistemaId: string; nome: string; logins: number; gb: number; produtos: number | null; preco: number }): Promise<{ ok: boolean; erro?: string }> {
  const r = await ref();
  if (!r) return { ok: false, erro: "Supabase não configurado." };
  if (!p.sistemaId || !p.nome?.trim()) return { ok: false, erro: "Informe o sistema e o nome do plano." };
  await ensure(r);
  const sid = p.sistemaId.replace(/[^a-z0-9_-]/gi, "");
  const nome = p.nome.trim().slice(0, 80).replace(/'/g, "''");
  const prod = p.produtos == null ? "null" : String(Math.max(0, Math.round(p.produtos)));
  const res = await runSupabaseQuery(r, `insert into central.planos (sistema_id, nome, logins, gb, produtos, preco) values ('${sid}', '${nome}', ${Math.max(0, Math.round(p.logins))}, ${Number(p.gb) || 0}, ${prod}, ${Number(p.preco) || 0});`);
  return res !== null ? { ok: true } : { ok: false, erro: "Não foi possível salvar." };
}

export async function removerPlanoCentral(id: string): Promise<{ ok: boolean }> {
  const r = await ref();
  if (!r) return { ok: false };
  const idSafe = id.replace(/[^a-f0-9-]/gi, "");
  const res = await runSupabaseQuery(r, `delete from central.planos where id = '${idSafe}';`);
  return { ok: res !== null };
}
