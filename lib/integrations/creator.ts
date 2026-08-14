import { unstable_cache } from "next/cache";

// Integração com o Perspecta Creator (Render + SQLite): não dá para ler o banco
// direto (é um arquivo no disco do Render), então o Central usa a API REST do
// próprio Creator — faz login e puxa os clientes.
// Env: CREATOR_API_URL, CREATOR_USER, CREATOR_PASS (e CREATOR_ORG se houver).

export function creatorConfigured(): boolean {
  return Boolean(process.env.CREATOR_API_URL && process.env.CREATOR_USER && process.env.CREATOR_PASS);
}

async function creatorToken(): Promise<string | null> {
  try {
    const res = await fetch(`${process.env.CREATOR_API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organization: process.env.CREATOR_ORG || undefined,
        username: process.env.CREATOR_USER,
        password: process.env.CREATOR_PASS,
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    return j?.token || null;
  } catch {
    return null;
  }
}

// Puxa os clientes do Creator via API (login + GET /api/clients). Cache 60s.
async function _getCreatorClients(): Promise<any[] | null> {
  if (!creatorConfigured()) return null;
  const token = await creatorToken();
  if (!token) return null;
  try {
    const res = await fetch(`${process.env.CREATOR_API_URL}/api/clients`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return Array.isArray(data) ? data : data?.clients || data?.rows || [];
  } catch {
    return null;
  }
}

export const getCreatorClients = unstable_cache(_getCreatorClients, ["creator-clients"], { revalidate: 60 });

// Diagnóstico: conecta na API do Creator e conta os clientes.
export async function creatorStatus(): Promise<{ configurado: boolean; ok: boolean; clientes: number; erro?: string }> {
  if (!creatorConfigured()) return { configurado: false, ok: false, clientes: 0 };
  const rows = await getCreatorClients();
  if (rows === null) return { configurado: true, ok: false, clientes: 0, erro: "login ou API falhou (confira organização/usuário/senha)" };
  return { configurado: true, ok: true, clientes: rows.length };
}
