import { unstable_cache } from "next/cache";

// Integração com o Perspecta Creator (Render + SQLite): não dá para ler o banco
// direto (é um arquivo no disco do Render), então o Central usa a API REST do
// próprio Creator — faz login e puxa os clientes.
// Env: CREATOR_API_URL, CREATOR_USER, CREATOR_PASS (e CREATOR_ORG se houver).

export function creatorConfigured(): boolean {
  return Boolean(process.env.CREATOR_API_URL && process.env.CREATOR_USER && process.env.CREATOR_PASS);
}

// Lista o que falta configurar, para o diagnóstico apontar direto o buraco.
function faltando(): string[] {
  const f: string[] = [];
  if (!process.env.CREATOR_API_URL) f.push("CREATOR_API_URL");
  if (!process.env.CREATOR_USER) f.push("CREATOR_USER");
  if (!process.env.CREATOR_PASS) f.push("CREATOR_PASS");
  return f;
}

function baseUrl(): string {
  return (process.env.CREATOR_API_URL || "").replace(/\/+$/, "");
}

// Faz login e devolve o token OU uma explicação do porquê falhou.
async function creatorLogin(): Promise<{ token: string | null; erro?: string }> {
  const url = `${baseUrl()}/api/auth/login`;
  const body: Record<string, any> = {
    username: process.env.CREATOR_USER,
    password: process.env.CREATOR_PASS,
  };
  if (process.env.CREATOR_ORG) body.organization = process.env.CREATOR_ORG;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const txt = await res.text();
    if (!res.ok) {
      let msg = "";
      try { msg = JSON.parse(txt)?.error || JSON.parse(txt)?.message || ""; } catch { msg = txt.slice(0, 120); }
      if (res.status === 401 || res.status === 400) {
        return { token: null, erro: `login recusado (HTTP ${res.status}${msg ? ` – ${msg}` : ""}). Confira CREATOR_USER/CREATOR_PASS${process.env.CREATOR_ORG ? "/CREATOR_ORG" : " (talvez falte CREATOR_ORG)"}.` };
      }
      if (res.status === 404) return { token: null, erro: `endpoint ${url} não existe (HTTP 404). Confira CREATOR_API_URL.` };
      return { token: null, erro: `login falhou (HTTP ${res.status}${msg ? ` – ${msg}` : ""}).` };
    }
    let j: any = {};
    try { j = JSON.parse(txt); } catch {}
    const token = j?.token || j?.accessToken || j?.jwt || null;
    if (!token) return { token: null, erro: "login respondeu 200 mas sem token no corpo (formato inesperado)." };
    return { token };
  } catch (e: any) {
    return { token: null, erro: `não alcançou ${url} (${e?.message || "rede"}). Serviço do Render pode estar dormindo/fora do ar.` };
  }
}

// Puxa os clientes do Creator via API (login + GET /api/clients) com diagnóstico.
async function fetchCreator(): Promise<{ rows: any[] | null; erro?: string }> {
  if (!creatorConfigured()) return { rows: null, erro: `falta configurar: ${faltando().join(", ")}` };
  const { token, erro } = await creatorLogin();
  if (!token) return { rows: null, erro };
  try {
    const res = await fetch(`${baseUrl()}/api/clients`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return { rows: null, erro: `logou, mas GET /api/clients deu HTTP ${res.status}.` };
    const data: any = await res.json();
    const rows = Array.isArray(data) ? data : data?.clients || data?.rows || [];
    return { rows };
  } catch (e: any) {
    return { rows: null, erro: `logou, mas falhou ao ler clientes (${e?.message || "rede"}).` };
  }
}

// Cache curto (15s): enquanto se ajusta as variáveis (CREATOR_ORG/USER/PASS) no
// Vercel, o diagnóstico reflete a correção rápido, sem esperar um minuto.
const _getCreator = unstable_cache(fetchCreator, ["creator-clients-v3"], { revalidate: 15 });

// Só as linhas (para a página de clientes).
export async function getCreatorClients(): Promise<any[] | null> {
  const { rows } = await _getCreator();
  return rows;
}

// Diagnóstico: conecta na API do Creator, conta os clientes e explica falhas.
export async function creatorStatus(): Promise<{ configurado: boolean; ok: boolean; clientes: number; erro?: string }> {
  if (!creatorConfigured()) return { configurado: false, ok: false, clientes: 0, erro: `falta: ${faltando().join(", ")}` };
  const { rows, erro } = await _getCreator();
  if (rows === null) return { configurado: true, ok: false, clientes: 0, erro };
  return { configurado: true, ok: true, clientes: rows.length };
}

// ————————————————————————————————————————————————————————————————
// Acessos / provisionamento (escrita de volta no Creator)
// ————————————————————————————————————————————————————————————————

export type CreatorMe = { ok: boolean; papel?: string; usuario?: string; escritorio?: string; superadmin: boolean; erro?: string };

// Quem é a conta configurada (papel). Só superadmin cria escritórios.
async function _creatorMe(): Promise<CreatorMe> {
  if (!creatorConfigured()) return { ok: false, superadmin: false, erro: `falta: ${faltando().join(", ")}` };
  const { token, erro } = await creatorLogin();
  if (!token) return { ok: false, superadmin: false, erro };
  try {
    const res = await fetch(`${baseUrl()}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) return { ok: false, superadmin: false, erro: `/api/auth/me deu HTTP ${res.status}` };
    const j: any = await res.json();
    const papel = j?.role || j?.user?.role;
    console.log("[contas-debug] creator /me:", JSON.stringify(j));
    return { ok: true, superadmin: papel === "superadmin", papel, usuario: j?.username || j?.user?.username, escritorio: j?.org_name || j?.org?.name };
  } catch (e: any) {
    return { ok: false, superadmin: false, erro: e?.message || "rede" };
  }
}
export const creatorMe = unstable_cache(_creatorMe, ["creator-me-v1"], { revalidate: 15 });

// Lista os escritórios (contas de cliente) do Creator. Precisa de superadmin.
async function _getCreatorOrgs(): Promise<{ orgs: any[] | null; erro?: string }> {
  if (!creatorConfigured()) return { orgs: null, erro: `falta: ${faltando().join(", ")}` };
  const { token, erro } = await creatorLogin();
  if (!token) return { orgs: null, erro };
  try {
    const res = await fetch(`${baseUrl()}/api/organizations`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (res.status === 403) return { orgs: null, erro: "a conta não é superadmin — só o escritório master lista/cria acessos." };
    if (!res.ok) return { orgs: null, erro: `GET /api/organizations deu HTTP ${res.status}` };
    const data: any = await res.json();
    return { orgs: Array.isArray(data) ? data : data?.rows || [] };
  } catch (e: any) {
    return { orgs: null, erro: e?.message || "rede" };
  }
}
export const getCreatorOrgs = unstable_cache(_getCreatorOrgs, ["creator-orgs-v1"], { revalidate: 15 });

export type CreatorReceita = { mrr: number; previsto: number; pagantes: number; emTeste: number; expirados: number; total: number };

// Receita do Creator (o que os escritórios pagam). Vem pronto da API dele.
async function _getCreatorReceita(): Promise<{ receita: CreatorReceita | null; erro?: string }> {
  if (!creatorConfigured()) return { receita: null, erro: `falta: ${faltando().join(", ")}` };
  const { token, erro } = await creatorLogin();
  if (!token) return { receita: null, erro };
  try {
    const res = await fetch(`${baseUrl()}/api/organizations/revenue`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    console.log("[contas-debug] creator /revenue HTTP:", res.status);
    if (res.status === 403) return { receita: null, erro: "a conta não é superadmin — só o master vê a receita." };
    if (!res.ok) return { receita: null, erro: `GET /revenue deu HTTP ${res.status}` };
    const j: any = await res.json();
    console.log("[contas-debug] creator /revenue body:", JSON.stringify(j));
    return { receita: {
      mrr: Number(j?.mrr) || 0,
      previsto: Number(j?.previsto) || 0,
      pagantes: Number(j?.pagantes) || 0,
      emTeste: Number(j?.em_teste) || 0,
      expirados: Number(j?.expirados) || 0,
      total: Number(j?.total_agencias) || 0,
    } };
  } catch (e: any) {
    return { receita: null, erro: e?.message || "rede" };
  }
}
export const getCreatorReceita = unstable_cache(_getCreatorReceita, ["creator-receita-v1"], { revalidate: 30 });

export type NovoEscritorio = { nome: string; adminUsuario: string; adminSenha: string; adminNome?: string; whatsapp?: string };

// Cria um escritório + login admin no Creator (escrita de volta). Sem cache.
export async function criarEscritorioCreator(input: NovoEscritorio): Promise<{ ok: boolean; id?: number; erro?: string }> {
  if (!creatorConfigured()) return { ok: false, erro: `falta configurar: ${faltando().join(", ")}` };
  if (!input.nome?.trim()) return { ok: false, erro: "informe o nome do escritório." };
  if (!input.adminUsuario?.trim() || !input.adminSenha) return { ok: false, erro: "informe usuário e senha do admin." };
  const { token, erro } = await creatorLogin();
  if (!token) return { ok: false, erro };
  try {
    const res = await fetch(`${baseUrl()}/api/organizations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: input.nome.trim(),
        admin_username: input.adminUsuario.trim(),
        admin_name: input.adminNome?.trim() || input.adminUsuario.trim(),
        admin_password: input.adminSenha,
        whatsapp: input.whatsapp?.trim() || undefined,
      }),
      cache: "no-store",
    });
    const txt = await res.text();
    let j: any = {}; try { j = JSON.parse(txt); } catch {}
    if (res.status === 403) return { ok: false, erro: "a conta não é superadmin — só o escritório master cria acessos." };
    if (res.status === 409) return { ok: false, erro: j?.error || "já existe um escritório com esse nome." };
    if (!res.ok) return { ok: false, erro: j?.error || `criar deu HTTP ${res.status}` };
    return { ok: true, id: j?.id };
  } catch (e: any) {
    return { ok: false, erro: e?.message || "rede" };
  }
}

export type AcaoEscritorio = "trial" | "ativar" | "desativar" | "excluir";

// Edita um escritório existente no Creator (estender trial, ativar/desativar,
// excluir). Precisa de superadmin. Sem cache.
export async function acaoEscritorioCreator(acao: AcaoEscritorio, id: number, dias = 15): Promise<{ ok: boolean; erro?: string }> {
  if (!creatorConfigured()) return { ok: false, erro: `falta configurar: ${faltando().join(", ")}` };
  if (!id) return { ok: false, erro: "escritório inválido." };
  const { token, erro } = await creatorLogin();
  if (!token) return { ok: false, erro };
  const auth = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  try {
    let res: Response;
    if (acao === "trial") {
      res = await fetch(`${baseUrl()}/api/organizations/${id}/extend-trial`, { method: "POST", headers: auth, body: JSON.stringify({ days: dias }), cache: "no-store" });
    } else if (acao === "excluir") {
      res = await fetch(`${baseUrl()}/api/organizations/${id}`, { method: "DELETE", headers: auth, cache: "no-store" });
    } else {
      res = await fetch(`${baseUrl()}/api/organizations/${id}`, { method: "PUT", headers: auth, body: JSON.stringify({ active: acao === "ativar" }), cache: "no-store" });
    }
    if (res.status === 403) return { ok: false, erro: "a conta não é superadmin." };
    if (res.status === 400) { const j: any = await res.json().catch(() => ({})); return { ok: false, erro: j?.error || "ação não permitida (o master não pode ser alterado assim)." }; }
    if (!res.ok) return { ok: false, erro: `ação deu HTTP ${res.status}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e?.message || "rede" };
  }
}

// ————————————————————————————————————————————————————————————————
// Logins DENTRO de um escritório (usuários da equipe daquele cliente)
// ————————————————————————————————————————————————————————————————
// O superadmin direciona a ação a um escritório pelo header x-org-id.

export type CreatorUser = { id: number; name: string; username: string; role: string; active: boolean };

function authOrg(token: string, orgId: number): Record<string, string> {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-org-id": String(orgId) };
}

// Lista os logins de um escritório.
export async function getCreatorUsers(orgId: number): Promise<{ users: CreatorUser[] | null; erro?: string }> {
  if (!creatorConfigured()) return { users: null, erro: `falta: ${faltando().join(", ")}` };
  const { token, erro } = await creatorLogin();
  if (!token) return { users: null, erro };
  try {
    const res = await fetch(`${baseUrl()}/api/users`, { headers: authOrg(token, orgId), cache: "no-store" });
    if (res.status === 403) return { users: null, erro: "a conta não é superadmin/admin." };
    if (!res.ok) return { users: null, erro: `GET /api/users deu HTTP ${res.status}` };
    const data: any = await res.json();
    const arr = Array.isArray(data) ? data : data?.rows || [];
    return { users: arr.map((u: any) => ({ id: u.id, name: u.name, username: u.username, role: u.role, active: !!u.active })) };
  } catch (e: any) {
    return { users: null, erro: e?.message || "rede" };
  }
}

export type NovoUsuario = { nome: string; usuario: string; senha: string; papel?: "member" | "admin" };

// Cria um login novo dentro de um escritório.
export async function criarUsuarioCreator(orgId: number, input: NovoUsuario): Promise<{ ok: boolean; erro?: string }> {
  if (!creatorConfigured()) return { ok: false, erro: `falta configurar: ${faltando().join(", ")}` };
  if (!input.nome?.trim() || !input.usuario?.trim() || !input.senha) return { ok: false, erro: "informe nome, usuário e senha." };
  const { token, erro } = await creatorLogin();
  if (!token) return { ok: false, erro };
  try {
    const res = await fetch(`${baseUrl()}/api/users`, {
      method: "POST",
      headers: authOrg(token, orgId),
      body: JSON.stringify({ name: input.nome.trim(), username: input.usuario.trim(), password: input.senha, role: input.papel === "admin" ? "admin" : "member" }),
      cache: "no-store",
    });
    const j: any = await res.json().catch(() => ({}));
    if (res.status === 409) return { ok: false, erro: j?.error || "usuário já existe nesse escritório." };
    if (res.status === 403) return { ok: false, erro: "a conta não é superadmin/admin." };
    if (!res.ok) return { ok: false, erro: j?.error || `criar deu HTTP ${res.status}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e?.message || "rede" };
  }
}

export type AcaoUsuario = "senha" | "ativar" | "desativar" | "excluir";

// Edita um login: resetar senha, ativar/desativar, excluir.
export async function acaoUsuarioCreator(acao: AcaoUsuario, orgId: number, userId: number, senha?: string): Promise<{ ok: boolean; erro?: string }> {
  if (!creatorConfigured()) return { ok: false, erro: `falta configurar: ${faltando().join(", ")}` };
  if (!orgId || !userId) return { ok: false, erro: "login inválido." };
  if (acao === "senha" && !senha) return { ok: false, erro: "informe a nova senha." };
  const { token, erro } = await creatorLogin();
  if (!token) return { ok: false, erro };
  try {
    let res: Response;
    if (acao === "excluir") {
      res = await fetch(`${baseUrl()}/api/users/${userId}`, { method: "DELETE", headers: authOrg(token, orgId), cache: "no-store" });
    } else {
      const body = acao === "senha" ? { password: senha } : { active: acao === "ativar" };
      res = await fetch(`${baseUrl()}/api/users/${userId}`, { method: "PUT", headers: authOrg(token, orgId), body: JSON.stringify(body), cache: "no-store" });
    }
    const j: any = await res.json().catch(() => ({}));
    if (res.status === 403) return { ok: false, erro: "a conta não é superadmin/admin." };
    if (res.status === 400) return { ok: false, erro: j?.error || "ação não permitida." };
    if (!res.ok) return { ok: false, erro: j?.error || `ação deu HTTP ${res.status}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e?.message || "rede" };
  }
}
