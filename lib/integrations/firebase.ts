import { unstable_cache } from "next/cache";

// Integração com o Firebase (Bistro) via conta de serviço, lendo o Realtime
// Database. O firebase-admin (pesado) é importado sob demanda (lazy) só quando
// precisamos ler o banco de verdade — no cache quente, nem carrega.

export function firebaseConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_B64);
}

function rawServiceAccount(): string | null {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (b64) {
    try { return Buffer.from(b64.trim(), "base64").toString("utf8"); } catch { return null; }
  }
  return process.env.FIREBASE_SERVICE_ACCOUNT || null;
}

// Parse tolerante: extrai o 1º objeto JSON balanceado, ignorando lixo/duplicação.
function parseServiceAccount(raw: string): any {
  try { return JSON.parse(raw); } catch {}
  const start = raw.indexOf("{");
  if (start < 0) throw new Error("chave sem JSON válido");
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return JSON.parse(raw.slice(start, i + 1)); }
  }
  throw new Error("JSON da chave incompleto");
}

function databaseUrl(sa: any): string | undefined {
  return process.env.FIREBASE_DATABASE_URL || (sa?.project_id ? `https://${sa.project_id}-default-rtdb.firebaseio.com` : undefined);
}

// Normaliza um valor do Realtime Database para exibir (objeto aninhado vira texto).
function safeDoc(id: string, data: any): Record<string, any> {
  if (data == null || typeof data !== "object") return { id, valor: data };
  const out: Record<string, any> = { id };
  for (const [k, v] of Object.entries(data)) {
    if (v == null) out[k] = v;
    else if (typeof v === "object") { try { out[k] = JSON.stringify(v); } catch { out[k] = "[obj]"; } }
    else out[k] = v;
  }
  return out;
}

// Lê a raiz do Realtime Database. Importa o firebase-admin sob demanda.
async function readRootRaw(): Promise<any | null> {
  if (!firebaseConfigured()) return null;
  try {
    const admin = (await import("firebase-admin")).default;
    const sa = parseServiceAccount(rawServiceAccount() as string);
    const app = admin.apps.length ? admin.app() : admin.initializeApp({ credential: admin.credential.cert(sa), databaseURL: databaseUrl(sa) });
    const snap = await admin.database(app).ref("/").get();
    return snap.exists() ? snap.val() : {};
  } catch {
    return null;
  }
}

// Cacheado por 60s: lê o banco inteiro no máximo 1x por minuto (e nem carrega o
// firebase-admin quando o cache está quente).
const readRoot = unstable_cache(readRootRaw, ["firebase-rtdb-root"], { revalidate: 60 });

// Diagnóstico: conecta no Realtime Database e conta os nós de topo.
export async function firebaseStatus(): Promise<{ configurado: boolean; ok: boolean; colecoes: number; erro?: string }> {
  if (!firebaseConfigured()) return { configurado: false, ok: false, colecoes: 0 };
  const root = await readRoot();
  if (root === null) return { configurado: true, ok: false, colecoes: 0, erro: "não conectou ao Realtime Database (confira a chave e a FIREBASE_DATABASE_URL)" };
  const n = root && typeof root === "object" ? Object.keys(root).length : 0;
  return { configurado: true, ok: true, colecoes: n };
}

// Lista os nós de topo do Realtime Database com uma amostra de itens.
export async function findFirebaseNodes(): Promise<{ colecao: string; amostra: any[] }[] | null> {
  const root = await readRoot();
  if (root === null) return null;
  if (!root || typeof root !== "object") return [];
  const out: { colecao: string; amostra: any[] }[] = [];
  for (const [key, val] of Object.entries(root)) {
    if (val && typeof val === "object") {
      const children = Object.entries(val as any).slice(0, 3).map(([id, v]) => safeDoc(id, v));
      if (children.length) out.push({ colecao: key, amostra: children });
    }
  }
  return out;
}

// Tamanho aproximado dos dados no Realtime Database (MB), pelo JSON da árvore.
// É estimativa (o tamanho real no Firebase inclui índices), mas serve de régua
// para a barra de "quanto falta pro limite do plano grátis".
export async function getFirebaseSizeMb(): Promise<number | null> {
  const root = await readRoot();
  if (root == null || typeof root !== "object") return null;
  try { return Buffer.byteLength(JSON.stringify(root), "utf8") / (1024 * 1024); } catch { return null; }
}

// Conta as "contas" do Bistro (estabelecimentos/restaurantes que assinam).
// Escolhe o nó de topo com cara de empresa/estabelecimento e conta os filhos.
// Transparente: devolve também os candidatos para conferência.
export async function getContagemContasBistro(): Promise<{ n: number | null; no?: string; candidatos: { no: string; n: number }[] }> {
  const root = await readRoot();
  if (!root || typeof root !== "object") return { n: null, candidatos: [] };
  const re = /restauran|estabelec|empresa|neg[óo]cio|negocio|loja|conta|company|tenant|com[ée]rcio|comercio|unidade/i;
  const candidatos = Object.entries(root)
    .filter(([, v]) => v && typeof v === "object")
    .map(([no, v]) => ({ no, n: Object.keys(v as any).length }));
  const alvo = candidatos.find((c) => re.test(c.no));
  return { n: alvo ? alvo.n : null, no: alvo?.no, candidatos };
}

// Lê os itens dos nós que representam clientes do Bistro (até 50 por nó).
export async function getFirebaseClientDocs(): Promise<{ colecao: string; rows: any[] }[] | null> {
  const root = await readRoot();
  if (root === null) return null;
  if (!root || typeof root !== "object") return [];
  const nomeCliente = /client|customer|empresa|cliente|tenant|company|conta|account|user|usuario|restaurante|estabelecimento|mesa|pedido/i;
  let keys = Object.keys(root).filter((k) => nomeCliente.test(k) && root[k] && typeof root[k] === "object");
  if (keys.length === 0) keys = Object.keys(root).filter((k) => root[k] && typeof root[k] === "object").slice(0, 10);
  const out: { colecao: string; rows: any[] }[] = [];
  for (const k of keys) {
    const children = Object.entries(root[k]).slice(0, 50).map(([id, v]) => safeDoc(id, v));
    if (children.length) out.push({ colecao: k, rows: children });
  }
  return out;
}
