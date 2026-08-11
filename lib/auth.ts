// Autenticação leve, sem dependências: cookie assinado com HMAC (Web Crypto).
// Funciona tanto no middleware (edge) quanto nas rotas (node).
// A senha/segredo vêm de variáveis de ambiente — NUNCA ficam no código.

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(str: string): string {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  return atob(s);
}

async function hmac(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(body)));
  return b64url(sig);
}

// Cria um token: base64url(email|expiração) + "." + assinatura
export async function makeToken(email: string, secret: string, ttlSec = 60 * 60 * 24 * 7): Promise<string> {
  const exp = Date.now() + ttlSec * 1000;
  const body = b64url(enc.encode(email + "|" + exp));
  const sig = await hmac(body, secret);
  return body + "." + sig;
}

// Verifica assinatura e expiração. Retorna { email } se válido, senão null.
export async function verifyToken(token: string | undefined, secret: string): Promise<{ email: string } | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expect = await hmac(body, secret);
  if (sig !== expect) return null;
  const raw = b64urlDecode(body);
  const [email, exp] = raw.split("|");
  if (!exp || Number(exp) < Date.now()) return null;
  return { email };
}

// A proteção só está ativa quando AMBOS (e-mail e senha) estão configurados.
// Assim ninguém fica trancado pra fora antes de definir as credenciais.
export function authEnabled(): boolean {
  return Boolean(process.env.AUTH_EMAIL && process.env.AUTH_PASSWORD);
}
export function authSecret(): string {
  return process.env.AUTH_SECRET || process.env.AUTH_PASSWORD || "perspecta-dev-secret";
}
