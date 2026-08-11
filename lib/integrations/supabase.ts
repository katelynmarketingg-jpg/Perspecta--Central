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
