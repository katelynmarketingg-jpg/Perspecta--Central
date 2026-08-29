// Integração com o Perspecta Commerce (Next.js + Supabase) — cria a loja +
// usuário de verdade via a própria API do Supabase (Auth + RPC create_tenant),
// sem precisar de nenhum backend customizado do Commerce.
// Env: COMMERCE_SUPABASE_URL, COMMERCE_SUPABASE_ANON_KEY, COMMERCE_SUPABASE_SERVICE_ROLE_KEY.

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

export type NovaLojaCommerce = { nomeLoja: string; email: string; senha: string };

// Cria o usuário (já confirmado, sem esperar e-mail), loga como ele e cria a
// loja (tenant) via a função create_tenant do próprio banco — o mesmo caminho
// que a página pública /signup do Commerce usa, só que feito pelo servidor.
export async function criarLojaCommerce(input: NovaLojaCommerce): Promise<{ ok: boolean; erro?: string }> {
  if (!commerceConfigured()) return { ok: false, erro: `falta configurar: ${faltando().join(", ")}` };
  if (!input.nomeLoja?.trim()) return { ok: false, erro: "informe o nome da loja." };
  if (!input.email?.trim() || !input.senha) return { ok: false, erro: "informe e-mail e senha." };

  const url = baseUrl();
  const anon = process.env.COMMERCE_SUPABASE_ANON_KEY as string;
  const service = process.env.COMMERCE_SUPABASE_SERVICE_ROLE_KEY as string;

  try {
    // 1) Cria o usuário já confirmado (Admin API — precisa da service role).
    const criaRes = await fetch(`${url}/auth/v1/admin/users`, {
      method: "POST",
      headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: input.email.trim(), password: input.senha, email_confirm: true }),
    });
    const criaTxt = await criaRes.text();
    let criaJ: any = {}; try { criaJ = JSON.parse(criaTxt); } catch {}
    if (!criaRes.ok) {
      const msg = criaJ?.msg || criaJ?.message || criaTxt.slice(0, 160);
      if (criaRes.status === 422 || /already.*registered/i.test(msg)) {
        return { ok: false, erro: "já existe uma conta com esse e-mail no Commerce." };
      }
      return { ok: false, erro: `criar usuário deu HTTP ${criaRes.status}${msg ? ` – ${msg}` : ""}` };
    }

    // 2) Loga como o usuário recém-criado (grant password) — pega um token dele.
    const loginRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ email: input.email.trim(), password: input.senha }),
    });
    const loginJ: any = await loginRes.json().catch(() => ({}));
    if (!loginRes.ok || !loginJ?.access_token) {
      return { ok: false, erro: `usuário criado, mas não consegui logar como ele (HTTP ${loginRes.status}).` };
    }

    // 3) Cria a loja (tenant) com esse token — auth.uid() resolve certo.
    const rpcRes = await fetch(`${url}/rest/v1/rpc/create_tenant`, {
      method: "POST",
      headers: { apikey: anon, Authorization: `Bearer ${loginJ.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_name: input.nomeLoja.trim(), p_slug: input.nomeLoja.trim() }),
    });
    if (!rpcRes.ok) {
      const t = await rpcRes.text();
      return { ok: false, erro: `usuário criado, mas a loja não (HTTP ${rpcRes.status} – ${t.slice(0, 160)}).` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e?.message || "rede" };
  }
}

// Diagnóstico simples: as chaves respondem?
export async function commerceStatus(): Promise<{ configurado: boolean; ok: boolean; erro?: string }> {
  if (!commerceConfigured()) return { configurado: false, ok: false, erro: `falta: ${faltando().join(", ")}` };
  try {
    const res = await fetch(`${baseUrl()}/auth/v1/settings`, { headers: { apikey: process.env.COMMERCE_SUPABASE_ANON_KEY as string } });
    return { configurado: true, ok: res.ok, erro: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e: any) {
    return { configurado: true, ok: false, erro: e?.message || "rede" };
  }
}
