import { runSupabaseQuery, supabaseConfigured } from "./integrations/supabase";

// Configurações do Central salvas no banco (não em env var) — coisas que
// você troca pela tela, tipo qual provedor de pagamento está ativo agora.
// Schema central.configuracoes: chave text PK, valor jsonb.

async function ref(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const sistemas = await (await import("./data")).getSistemas();
  return sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;
}

export async function getConfig<T = any>(chave: string, padrao: T): Promise<T> {
  const r = await ref();
  if (!r) return padrao;
  const chaveSafe = chave.replace(/[^a-z0-9_.-]/gi, "");
  const rows = await runSupabaseQuery(r, `select valor from central.configuracoes where chave = '${chaveSafe}';`);
  if (!rows || !rows[0]) return padrao;
  return rows[0].valor as T;
}

export async function setConfig(chave: string, valor: any): Promise<{ ok: boolean; erro?: string }> {
  const r = await ref();
  if (!r) return { ok: false, erro: "Supabase não configurado." };
  const chaveSafe = chave.replace(/[^a-z0-9_.-]/gi, "");
  const json = JSON.stringify(valor).replace(/'/g, "''");
  const res = await runSupabaseQuery(
    r,
    `insert into central.configuracoes (chave, valor, atualizado_em) values ('${chaveSafe}', '${json}'::jsonb, now())
     on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();`
  );
  return res !== null ? { ok: true } : { ok: false, erro: "Não foi possível salvar." };
}
