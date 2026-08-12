// Integração com a Supabase Management API — status/uso/advisories por projeto.
// Enquanto SUPABASE_MANAGEMENT_TOKEN não estiver setado, o Central usa mock.

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

// Tamanho REAL do banco do projeto (em MB), via query SQL na Management API.
// Roda um SELECT somente-leitura (pg_database_size) — seguro. Retorna null → cai em mock.
export async function getProjectDbSizeMb(ref: string): Promise<number | null> {
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
