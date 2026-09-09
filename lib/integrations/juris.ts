import { unstable_cache } from "next/cache";
// Integração com o Perspecta Juris (Render + Postgres) — cria escritório +
// usuário admin de verdade via a API de master dele.
// Env: JURIS_API_URL, JURIS_EMPRESA (nome do escritório master, ex.: "Perspecta Juris"),
// JURIS_USER (login do usuário master, ex.: "katelyn"), JURIS_PASS.

export function jurisConfigured(): boolean {
  return Boolean(process.env.JURIS_API_URL && process.env.JURIS_EMPRESA && process.env.JURIS_USER && process.env.JURIS_PASS);
}

function faltando(): string[] {
  const f: string[] = [];
  if (!process.env.JURIS_API_URL) f.push("JURIS_API_URL");
  if (!process.env.JURIS_EMPRESA) f.push("JURIS_EMPRESA");
  if (!process.env.JURIS_USER) f.push("JURIS_USER");
  if (!process.env.JURIS_PASS) f.push("JURIS_PASS");
  return f;
}

function baseUrl(): string {
  return (process.env.JURIS_API_URL || "").replace(/\/+$/, "");
}

async function jurisLogin(): Promise<{ token: string | null; erro?: string }> {
  const url = `${baseUrl()}/api/auth/login`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa: process.env.JURIS_EMPRESA, nome: process.env.JURIS_USER, senha: process.env.JURIS_PASS }),
      cache: "no-store",
    });
    const txt = await res.text();
    if (!res.ok) {
      let msg = ""; try { msg = JSON.parse(txt)?.message || ""; } catch { msg = txt.slice(0, 120); }
      if (res.status === 401) return { token: null, erro: `login recusado (HTTP 401${msg ? ` – ${msg}` : ""}). Confira JURIS_EMPRESA/JURIS_USER/JURIS_PASS.` };
      if (res.status === 404) return { token: null, erro: `endpoint ${url} não existe (HTTP 404). Confira JURIS_API_URL.` };
      return { token: null, erro: `login falhou (HTTP ${res.status}${msg ? ` – ${msg}` : ""}).` };
    }
    let j: any = {}; try { j = JSON.parse(txt); } catch {}
    const token = j?.accessToken || null;
    if (!token) return { token: null, erro: "login respondeu 200 mas sem accessToken no corpo (formato inesperado)." };
    return { token };
  } catch (e: any) {
    return { token: null, erro: `não alcançou ${url} (${e?.message || "rede"}). Serviço do Render pode estar dormindo/fora do ar.` };
  }
}

export type NovoEscritorioJuris = { nome: string; adminLogin: string; adminSenha: string; adminNome?: string; adminEmail?: string; plano?: string };

// Cria um escritório (tenant) + usuário admin no Juris (escrita de volta).
export async function criarEscritorioJuris(input: NovoEscritorioJuris): Promise<{ ok: boolean; id?: string; erro?: string }> {
  if (!jurisConfigured()) return { ok: false, erro: `falta configurar: ${faltando().join(", ")}` };
  if (!input.nome?.trim()) return { ok: false, erro: "informe o nome do escritório." };
  if (!input.adminLogin?.trim() || !input.adminSenha) return { ok: false, erro: "informe login e senha do admin." };
  const { token, erro } = await jurisLogin();
  if (!token) return { ok: false, erro };
  try {
    const res = await fetch(`${baseUrl()}/api/master/companies`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: input.nome.trim(),
        adminLogin: input.adminLogin.trim(),
        adminPassword: input.adminSenha,
        adminName: input.adminNome?.trim() || input.adminLogin.trim(),
        adminEmail: input.adminEmail?.trim() || undefined,
        plan: input.plano || "starter",
      }),
      cache: "no-store",
    });
    const txt = await res.text();
    let j: any = {}; try { j = JSON.parse(txt); } catch {}
    if (res.status === 403) return { ok: false, erro: "a conta não é master — só o escritório master cria acessos." };
    if (!res.ok) return { ok: false, erro: j?.message || `criar deu HTTP ${res.status}` };
    return { ok: true, id: j?.id };
  } catch (e: any) {
    return { ok: false, erro: e?.message || "rede" };
  }
}

// Lista os escritórios (tenants) já cadastrados no Juris — os acessos que já
// existem. GET /api/master/companies com o token master. Cacheado 60s.
async function _listarEscritoriosJuris(): Promise<{ nome: string; plano: string; usuarios: number; clientes: number }[] | null> {
  if (!jurisConfigured()) return null;
  const { token } = await jurisLogin();
  if (!token) return null;
  try {
    const res = await fetch(`${baseUrl()}/api/master/companies`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    const rows = Array.isArray(j) ? j : j?.companies || j?.data || [];
    return rows.map((t: any) => ({
      nome: String(t.name || t.nome || "—"),
      plano: String(t.plan || t.plano || ""),
      usuarios: Number(t.usersCount ?? t.usuarios ?? 0) || 0,
      clientes: Number(t.clientsCount ?? t.clientes ?? 0) || 0,
    }));
  } catch { return null; }
}
export const listarEscritoriosJuris = unstable_cache(_listarEscritoriosJuris, ["juris-escritorios-v1"], { revalidate: 60 });

// Diagnóstico: conecta na API do Juris como master. Cacheado 60s (evita
// refazer login no Render — lento em cold start — a cada carregamento).
async function _jurisStatus(): Promise<{ configurado: boolean; ok: boolean; erro?: string }> {
  if (!jurisConfigured()) return { configurado: false, ok: false, erro: `falta: ${faltando().join(", ")}` };
  const { token, erro } = await jurisLogin();
  return { configurado: true, ok: Boolean(token), erro };
}
export const jurisStatus = unstable_cache(_jurisStatus, ["juris-status-v1"], { revalidate: 60 });
