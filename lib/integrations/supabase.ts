// Integração com a Supabase Management API — status/uso/advisories por projeto.
// Enquanto SUPABASE_MANAGEMENT_TOKEN não estiver setado, o Central usa mock.
import { unstable_cache } from "next/cache";

export function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_MANAGEMENT_TOKEN);
}

export async function getProjectHealth(ref: string): Promise<{
  status: "operacional" | "degradado" | "com_erro";
  dbUsageMb?: number;
  advisories?: number;
} | null> {
  if (!supabaseConfigured() || !ref) return null; // → provedor cai em mock
  try {
    const token = process.env.SUPABASE_MANAGEMENT_TOKEN;
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}`, {
      headers: { Authorization: `Bearer ${token}` },
      // status de projeto muda devagar; cache curto
      next: { revalidate: 300 },
    });
    if (!res.ok) return { status: "com_erro" };
    const p: any = await res.json();
    const paused = p?.status && String(p.status).toUpperCase().includes("PAUSE");
    return { status: paused ? "degradado" : "operacional" };
  } catch {
    return { status: "com_erro" };
  }
}

// Roda uma query somente-leitura no banco do projeto via Management API e
// devolve as linhas (array de objetos). Retorna null se sem chave/erro.
export async function runSupabaseQuery(ref: string, sql: string): Promise<any[] | null> {
  if (!supabaseConfigured() || !ref) return null;
  try {
    const token = process.env.SUPABASE_MANAGEMENT_TOKEN;
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: sql }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.result)) return data.result;
    return null;
  } catch {
    return null;
  }
}

// Localiza tabelas que parecem guardar clientes/empresas ou usuários/logins
// (pelas colunas), com uma amostra de linhas — para descobrir ONDE cada dado mora.
async function _findKeyTables(ref: string): Promise<
  { tabela: string; colunas: string; tipo: "clientes" | "logins" | "ambos"; amostra: any[] }[] | null
> {
  const cands = await runSupabaseQuery(
    ref,
    `select table_name,
       string_agg(column_name, ', ' order by ordinal_position) as cols,
       bool_or(column_name ~* 'cliente|empresa|company|razao|customer|tenant') as tem_cliente,
       bool_or(column_name ~* 'user|login|usuario|senha|password|auth') as tem_login
     from information_schema.columns
     where table_schema = 'public'
       and column_name ~* 'nome|name|email|cliente|empresa|company|razao|customer|tenant|user|login|usuario|senha|password|phone|telefone|documento|cpf|cnpj'
     group by table_name
     order by table_name;`
  );
  if (!cands) return null;

  const results = await Promise.all(
    cands.slice(0, 20).map(async (c: any) => {
      const rows = await runSupabaseQuery(ref, `select to_jsonb(x) as r from "${c.table_name}" x limit 3;`);
      const amostra = (rows || []).map((o: any) => o.r).filter(Boolean);
      if (amostra.length === 0) return null;
      const tipo: "clientes" | "logins" | "ambos" = c.tem_cliente && c.tem_login ? "ambos" : c.tem_login ? "logins" : "clientes";
      return { tabela: String(c.table_name), colunas: String(c.cols), tipo, amostra };
    })
  );
  return results.filter(Boolean) as { tabela: string; colunas: string; tipo: "clientes" | "logins" | "ambos"; amostra: any[] }[];
}

// Diagnóstico: confirma se o token consegue consultar o banco.
async function _supabaseStatus(ref: string): Promise<{ configurado: boolean; ok: boolean; tabelas: number }> {
  if (!supabaseConfigured() || !ref) return { configurado: supabaseConfigured(), ok: false, tabelas: 0 };
  const rows = await runSupabaseQuery(ref, "select count(*)::int as n from information_schema.tables where table_schema = 'public';");
  const ok = Array.isArray(rows) && rows.length > 0;
  return { configurado: true, ok, tabelas: ok ? Number(rows[0].n) || 0 : 0 };
}

// Lê as linhas das tabelas que representam clientes/empresas (nome+email ou
// nome de tabela tipo customers/clients/empresas). Até 50 linhas por tabela.
async function _getClientRows(ref: string): Promise<{ tabela: string; rows: any[] }[] | null> {
  const cands = await runSupabaseQuery(
    ref,
    `select table_name
     from information_schema.columns
     where table_schema = 'public'
     group by table_name
     having (bool_or(column_name ~* '^(name|nome|razao_social|razao|nome_fantasia|full_name|fantasia)$')
             and bool_or(column_name ~* 'email'))
        or table_name ~* 'client|customer|empresa|cliente|tenant|company|conta|account'
     order by table_name;`
  );
  if (!cands) return null;
  const results = await Promise.all(
    cands.slice(0, 12).map(async (c: any) => {
      const rows = await runSupabaseQuery(ref, `select to_jsonb(x) as r from "${c.table_name}" x limit 50;`);
      const r = (rows || []).map((o: any) => o.r).filter(Boolean);
      return r.length ? { tabela: String(c.table_name), rows: r } : null;
    })
  );
  return results.filter(Boolean) as { tabela: string; rows: any[] }[];
}

// Lista as tabelas reais (schema public) do projeto, com estimativa de linhas.
async function _listSupabaseTables(ref: string): Promise<{ tabela: string; linhas: number }[] | null> {
  const rows = await runSupabaseQuery(
    ref,
    "select relname as tabela, n_live_tup as linhas from pg_stat_user_tables order by n_live_tup desc, relname;"
  );
  if (!rows) return null;
  return rows.map((r) => ({ tabela: String(r.tabela), linhas: Number(r.linhas) || 0 }));
}

// Tamanho REAL do banco do projeto (em MB), via query SQL na Management API.
// Roda um SELECT somente-leitura (pg_database_size) — seguro. Retorna null → cai em mock.
async function _getProjectDbSizeMb(ref: string): Promise<number | null> {
  if (!supabaseConfigured() || !ref) return null;
  try {
    const token = process.env.SUPABASE_MANAGEMENT_TOKEN;
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "select pg_database_size(current_database()) as bytes;" }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const row = Array.isArray(data) ? data[0] : data?.result?.[0] ?? data?.[0];
    const bytes = Number(row?.bytes);
    return Number.isFinite(bytes) && bytes > 0 ? bytes / (1024 * 1024) : null;
  } catch {
    return null;
  }
}

// Conta as "contas" (empresas/tenants que assinam) por schema. O projeto
// compartilhado separa Juris (schema public) de Commerce (schema commerce).
// Transparente: devolve também as tabelas candidatas para conferência.
async function contaExata(ref: string, schema: string, tabela: string): Promise<number | null> {
  const r = await runSupabaseQuery(ref, `select count(*)::int as n from "${schema}"."${tabela}";`);
  return r && r.length ? Number(r[0].n) || 0 : null;
}

async function _getContagemContas(ref: string): Promise<{
  juris: number | null; commerce: number | null;
  jurisTabela?: string; commerceTabela?: string;
  candidatas: { schema: string; tabela: string; linhas: number }[];
}> {
  if (!supabaseConfigured() || !ref) return { juris: null, commerce: null, candidatas: [] };
  const cands = (await runSupabaseQuery(ref, `
    select schemaname as schema, relname as tabela, n_live_tup as linhas
    from pg_stat_user_tables
    where schemaname not in ('information_schema','pg_catalog','central','auth','storage','realtime','vault','extensions','graphql','graphql_public','pgbouncer','net','cron','supabase_functions','supabase_migrations')
      and relname ~* 'tenant|empresa|conta|company|companies|organizat|loja|store|seller|estabelec|assinante|subscriber|account'
    order by schemaname, n_live_tup desc;`)) || [];
  const candidatas = cands.map((r: any) => ({ schema: String(r.schema), tabela: String(r.tabela), linhas: Number(r.linhas) || 0 }));
  const score = (t: string) => (/tenant|empresa|conta|company/i.test(t) ? 2 : 1);
  const melhor = (schema: string) =>
    candidatas.filter((c) => c.schema === schema).sort((a, b) => score(b.tabela) - score(a.tabela) || b.linhas - a.linhas)[0];
  const jr = melhor("public");
  const cm = melhor("commerce");
  const [juris, commerce] = await Promise.all([
    jr ? contaExata(ref, jr.schema, jr.tabela) : Promise.resolve(null),
    cm ? contaExata(ref, cm.schema, cm.tabela) : Promise.resolve(null),
  ]);
  return { juris, commerce, jurisTabela: jr?.tabela, commerceTabela: cm?.tabela, candidatas };
}
export const getContagemContas = unstable_cache(_getContagemContas, ["sb-contas-v1"], { revalidate: 60 });

// Melhor tabela de "empresas/tenants" de um schema.
async function melhorTabela(ref: string, schema: string): Promise<string | null> {
  const cands = (await runSupabaseQuery(ref, `
    select relname as tabela from pg_stat_user_tables
    where schemaname = '${schema}'
      and relname ~* 'tenant|empresa|conta|company|companies|organizat|loja|store|seller|estabelec|assinante|subscriber|account'
    order by (relname ~* 'tenant|empresa|conta|company') desc, n_live_tup desc limit 1;`)) || [];
  return cands[0]?.tabela ? String(cands[0].tabela) : null;
}

// Nome de exibição de uma empresa (tenant) a partir da linha do banco.
export function nomeEmpresaRow(row: Record<string, any>): string {
  return String(row.name ?? row.nome ?? row.razao_social ?? row.fantasia ?? row.nome_fantasia ?? row.title ?? row.slug ?? row.email ?? row.id ?? "—");
}

// Linhas COMPLETAS das empresas (tenants) de Commerce (schema commerce) e
// Juris (public) — para listar/normalizar (nome, contato, valor).
async function _getContasRows(ref: string): Promise<{ commerce: any[]; juris: any[] }> {
  if (!supabaseConfigured() || !ref) return { commerce: [], juris: [] };
  const [jt, ct] = await Promise.all([melhorTabela(ref, "public"), melhorTabela(ref, "commerce")]);
  const rows = async (schema: string, tabela: string | null) => {
    if (!tabela) return [];
    const r = await runSupabaseQuery(ref, `select * from "${schema}"."${tabela}" limit 100;`);
    return r || [];
  };
  const [juris, commerce] = await Promise.all([rows("public", jt), rows("commerce", ct)]);
  return { commerce, juris };
}
export const getContasRows = unstable_cache(_getContasRows, ["sb-contas-rows-v2"], { revalidate: 60 });

// Versões cacheadas (60s): evitam refazer as consultas pesadas a cada acesso.
export const findKeyTables = unstable_cache(_findKeyTables, ["sb-find-key-tables"], { revalidate: 60 });
export const supabaseStatus = unstable_cache(_supabaseStatus, ["sb-status"], { revalidate: 60 });
export const getClientRows = unstable_cache(_getClientRows, ["sb-client-rows"], { revalidate: 60 });
export const listSupabaseTables = unstable_cache(_listSupabaseTables, ["sb-list-tables"], { revalidate: 60 });
export const getProjectDbSizeMb = unstable_cache(_getProjectDbSizeMb, ["sb-db-size"], { revalidate: 300 });
