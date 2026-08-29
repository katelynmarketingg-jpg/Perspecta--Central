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

// Diagnóstico: conecta na API do Juris como master.
export async function jurisStatus(): Promise<{ configurado: boolean; ok: boolean; erro?: string }> {
  if (!jurisConfigured()) return { configurado: false, ok: false, erro: `falta: ${faltando().join(", ")}` };
  const { token, erro } = await jurisLogin();
  return { configurado: true, ok: Boolean(token), erro };
}
