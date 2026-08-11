// Integração com a Vercel API — último deploy + runtime errors por projeto.
// Enquanto VERCEL_API_TOKEN não estiver setado, o Central usa mock.

export function vercelConfigured(): boolean {
  return Boolean(process.env.VERCEL_API_TOKEN);
}

export async function getLastDeploy(project: string): Promise<{
  estado: "sucesso" | "erro";
  quando: string;
} | null> {
  if (!vercelConfigured() || !project) return null; // → provedor cai em mock
  try {
    const token = process.env.VERCEL_API_TOKEN;
    const team = process.env.VERCEL_TEAM_ID;
    const q = new URLSearchParams({ app: project, limit: "1" });
    if (team) q.set("teamId", team);
    const res = await fetch(`https://api.vercel.com/v6/deployments?${q}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const d = data?.deployments?.[0];
    if (!d) return null;
    return {
      estado: d.state === "READY" ? "sucesso" : "erro",
      quando: new Date(d.created).toLocaleString("pt-BR"),
    };
  } catch {
    return null;
  }
}
