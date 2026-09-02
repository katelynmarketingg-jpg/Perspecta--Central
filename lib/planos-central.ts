import { runSupabaseQuery, supabaseConfigured } from "./integrations/supabase";

// Planos que a Perspecta cria para cada sistema. Salvos em central.planos —
// a MESMA tabela do schema real (central.sistemas/central.planos/...), com
// FK pra central.sistemas. Os nomes aqui (logins/gb/produtos/preco) são só a
// forma como a tela mostra; no banco os campos reais são
// limite_logins/limite_storage_mb/limite_registros/valor_mensal.
const GB = 1024;

export type PlanoCentral = {
  id: string; sistemaId: string; nome: string;
  logins: number; gb: number; produtos: number | null; preco: number;
};

async function ref(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const sistemas = await (await import("./data")).getSistemas();
  return sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;
}

export async function listarPlanosCentral(): Promise<PlanoCentral[]> {
  const r = await ref();
  if (!r) return [];
  const rows = await runSupabaseQuery(
    r,
    `select id, sistema_id, nome, valor_mensal, limite_storage_mb, limite_logins, limite_registros
     from central.planos where ativo is distinct from false order by sistema_id, valor_mensal;`
  );
  return (rows || []).map((x: any) => ({
    id: String(x.id), sistemaId: String(x.sistema_id), nome: String(x.nome),
    logins: Number(x.limite_logins) || 0, gb: x.limite_storage_mb == null ? 0 : Number(x.limite_storage_mb) / GB,
    produtos: x.limite_registros == null ? null : Number(x.limite_registros), preco: Number(x.valor_mensal) || 0,
  }));
}

export async function addPlanoCentral(p: { sistemaId: string; nome: string; logins: number; gb: number; produtos: number | null; preco: number }): Promise<{ ok: boolean; erro?: string }> {
  const r = await ref();
  if (!r) return { ok: false, erro: "Supabase não configurado." };
  if (!p.sistemaId || !p.nome?.trim()) return { ok: false, erro: "Informe o sistema e o nome do plano." };
  const sid = p.sistemaId.replace(/[^a-z0-9_-]/gi, "");
  const nome = p.nome.trim().slice(0, 80).replace(/'/g, "''");
  const registros = p.produtos == null ? "null" : String(Math.max(0, Math.round(p.produtos)));
  const storageMb = Math.max(0, Math.round((Number(p.gb) || 0) * GB));
  const res = await runSupabaseQuery(
    r,
    `insert into central.planos (sistema_id, nome, valor_mensal, limite_storage_mb, limite_logins, limite_registros)
     values ('${sid}', '${nome}', ${Number(p.preco) || 0}, ${storageMb}, ${Math.max(0, Math.round(p.logins))}, ${registros});`
  );
  return res !== null ? { ok: true } : { ok: false, erro: "Não foi possível salvar (confira se o sistema existe em central.sistemas)." };
}

export async function removerPlanoCentral(id: string): Promise<{ ok: boolean }> {
  const r = await ref();
  if (!r) return { ok: false };
  const idSafe = id.replace(/[^a-f0-9-]/gi, "");
  const res = await runSupabaseQuery(r, `delete from central.planos where id = '${idSafe}';`);
  return { ok: res !== null };
}
