import { unstable_cache } from "next/cache";
// Integração com o Perspecta Commerce (Next.js + Supabase) — cria a loja +
// usuário de verdade via a própria API do Supabase (Auth + RPC create_tenant),
// sem precisar de nenhum backend customizado do Commerce.
// Env: COMMERCE_SUPABASE_URL, COMMERCE_SUPABASE_ANON_KEY, COMMERCE_SUPABASE_SERVICE_ROLE_KEY.
//
// O Commerce hoje loga por Empresa + Nome + Senha (sem tela de e-mail): por
// baixo, cada login vira uma conta do Supabase Auth com um e-mail interno
// determinístico (empresa+nome). Pra um acesso criado por aqui funcionar de
// verdade, o e-mail da conta TEM que ser calculado com a mesma fórmula que o
// próprio Commerce usa no login — senão a conta existe mas ninguém consegue
// entrar nela. Ver src/app/actions/auth.ts (internalEmailFor) no Commerce.

function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function internalEmailFor(empresa: string, nome: string): string {
  const empresaSlug = slugify(empresa) || "loja";
  const nomeSlug = slugify(nome) || "user";
  return `${empresaSlug}.${nomeSlug}@contas.perspectacommerce.app`;
}

export function commerceConfigured(): boolean {
  return Boolean(process.env.COMMERCE_SUPABASE_URL && process.env.COMMERCE_SUPABASE_ANON_KEY && process.env.COMMERCE_SUPABASE_SERVICE_ROLE_KEY);
}

function faltando(): string[] {
  const f: string[] = [];
  if (!process.env.COMMERCE_SUPABASE_URL) f.push("COMMERCE_SUPABASE_URL");
  if (!process.env.COMMERCE_SUPABASE_ANON_KEY) f.push("COMMERCE_SUPABASE_ANON_KEY");
  if (!process.env.COMMERCE_SUPABASE_SERVICE_ROLE_KEY) f.push("COMMERCE_SUPABASE_SERVICE_ROLE_KEY");
  return f;
}

function baseUrl(): string {
  return (process.env.COMMERCE_SUPABASE_URL || "").replace(/\/+$/, "");
}

export type NovaLojaCommerce = { nomeLoja: string; adminUsuario: string; senha: string };

// Cria o usuário (já confirmado, sem esperar e-mail), loga como ele e cria a
// loja (tenant) via a função create_tenant do próprio banco — o mesmo caminho
// que a página pública /signup do Commerce usa, só que feito pelo servidor.
// O login do cliente vai ser Empresa "nomeLoja" + Nome "adminUsuario" + a
// senha escolhida — igual a como ele vai digitar em /login no Commerce.
export async function criarLojaCommerce(input: NovaLojaCommerce): Promise<{ ok: boolean; erro?: string }> {
  if (!commerceConfigured()) return { ok: false, erro: `falta configurar: ${faltando().join(", ")}` };
  if (!input.nomeLoja?.trim()) return { ok: false, erro: "informe o nome da loja." };
  if (!input.adminUsuario?.trim() || !input.senha) return { ok: false, erro: "informe usuário e senha." };

  const url = baseUrl();
  const service = process.env.COMMERCE_SUPABASE_SERVICE_ROLE_KEY as string;
  const email = internalEmailFor(input.nomeLoja, input.adminUsuario);

  const nomeLoja = input.nomeLoja.trim();
  const slug = slugify(nomeLoja) || "loja";
  try {
    // 1) Cria o usuário já confirmado (Admin API — precisa da service role).
    const criaRes = await fetch(`${url}/auth/v1/admin/users`, {
      method: "POST",
      headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: input.senha, email_confirm: true, user_metadata: { empresa: nomeLoja, nome: input.adminUsuario.trim() } }),
    });
    const criaTxt = await criaRes.text();
    let criaJ: any = {}; try { criaJ = JSON.parse(criaTxt); } catch {}
    if (!criaRes.ok) {
      const msg = criaJ?.msg || criaJ?.message || criaTxt.slice(0, 160);
      if (criaRes.status === 422 || /already.*registered/i.test(msg)) {
        return { ok: false, erro: "já existe um acesso com esse usuário nessa empresa." };
      }
      return { ok: false, erro: `criar usuário deu HTTP ${criaRes.status}${msg ? ` – ${msg}` : ""}` };
    }
    const userId: string | undefined = criaJ?.id || criaJ?.user?.id;
    if (!userId) return { ok: false, erro: "usuário criado, mas o Supabase não devolveu o id dele." };

    // 2) Cria a loja (tenant) direto na tabela com a service role — não depende
    // do RPC create_tenant (que às vezes some do cache do PostgREST). Bypassa RLS.
    const tenantRes = await fetch(`${url}/rest/v1/tenants`, {
      method: "POST",
      headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ name: nomeLoja, slug }),
    });
    const tenantTxt = await tenantRes.text();
    if (!tenantRes.ok) {
      // Desfaz o usuário órfão pra poder tentar de novo com o mesmo login.
      await fetch(`${url}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: { apikey: service, Authorization: `Bearer ${service}` } }).catch(() => {});
      if (/duplicate|already exists|unique/i.test(tenantTxt)) return { ok: false, erro: "já existe uma loja com esse nome. Tente outro." };
      return { ok: false, erro: `usuário criado, mas a loja não (HTTP ${tenantRes.status} – ${tenantTxt.slice(0, 160)}).` };
    }
    let tenantJ: any = null; try { tenantJ = JSON.parse(tenantTxt); } catch {}
    const tenantId: string | undefined = Array.isArray(tenantJ) ? tenantJ[0]?.id : tenantJ?.id;
    if (!tenantId) return { ok: false, erro: "loja criada, mas sem id de retorno." };

    // 3) Vincula o usuário como dono (owner) da loja.
    const memRes = await fetch(`${url}/rest/v1/memberships`, {
      method: "POST",
      headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, user_id: userId, role: "owner" }),
    });
    if (!memRes.ok) {
      const t = await memRes.text();
      return { ok: false, erro: `loja criada, mas não consegui vincular o dono (HTTP ${memRes.status} – ${t.slice(0, 160)}).` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e?.message || "rede" };
  }
}

// Lista os acessos que já existem no Commerce a partir das CONTAS de acesso
// (usuários Auth) — cada login do Commerce é uma conta do Supabase Auth. Não
// usa a tabela "tenants" de propósito: nesse projeto ela é compartilhada com o
// Juris, então listar tenants misturaria escritório de Juris como se fosse
// loja de Commerce. Cacheado 60s.
async function _listarLojasCommerce(): Promise<{ nome: string; slug: string; criado: string }[] | null> {
  if (!commerceConfigured()) return null;
  const svc = process.env.COMMERCE_SUPABASE_SERVICE_ROLE_KEY as string;
  const h = { apikey: svc, Authorization: `Bearer ${svc}` };
  try {
    const res = await fetch(`${baseUrl()}/auth/v1/admin/users?per_page=200`, { headers: h, cache: "no-store" });
    if (!res.ok) return null;
    const j: any = await res.json();
    const users = Array.isArray(j) ? j : j?.users || [];
    const saida: { nome: string; slug: string; criado: string }[] = [];
    const vistos = new Set<string>();
    for (const u of users) {
      const empresa = u?.user_metadata?.empresa || u?.raw_user_meta_data?.empresa;
      const nome = empresa ? String(empresa) : String(u?.email || u?.id || "—");
      const chave = nome.toLowerCase().trim();
      if (!chave || vistos.has(chave)) continue;
      vistos.add(chave);
      saida.push({ nome, slug: "", criado: String(u?.created_at || "") });
    }
    return saida;
  } catch { return null; }
}
export const listarLojasCommerce = unstable_cache(_listarLojasCommerce, ["commerce-lojas-v4"], { revalidate: 180, tags: ["acessos-dados"] });

// Lista as contas (usuários Auth) do Commerce — para descobrir quem é o dono.
export async function listarUsuariosCommerce(): Promise<{ email: string; criado: string }[] | null> {
  if (!commerceConfigured()) return null;
  try {
    const res = await fetch(`${baseUrl()}/auth/v1/admin/users?per_page=50`, {
      headers: { apikey: process.env.COMMERCE_SUPABASE_SERVICE_ROLE_KEY as string, Authorization: `Bearer ${process.env.COMMERCE_SUPABASE_SERVICE_ROLE_KEY as string}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    const users = Array.isArray(j) ? j : j?.users || [];
    return users.map((u: any) => ({ email: String(u.email || u.id), criado: String(u.created_at || "") })).sort((a: any, b: any) => a.criado.localeCompare(b.criado));
  } catch { return null; }
}

// Diagnóstico simples: as chaves respondem? Cacheado 60s.
async function _commerceStatus(): Promise<{ configurado: boolean; ok: boolean; erro?: string }> {
  if (!commerceConfigured()) return { configurado: false, ok: false, erro: `falta: ${faltando().join(", ")}` };
  try {
    const res = await fetch(`${baseUrl()}/auth/v1/settings`, { headers: { apikey: process.env.COMMERCE_SUPABASE_ANON_KEY as string } });
    return { configurado: true, ok: res.ok, erro: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e: any) {
    return { configurado: true, ok: false, erro: e?.message || "rede" };
  }
}
export const commerceStatus = unstable_cache(_commerceStatus, ["commerce-status-v2"], { revalidate: 300 });
