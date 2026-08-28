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

// Nome de estabelecimento a partir do slug (ex.: "alianca-pastelaria" → "Alianca Pastelaria").
function bonito(slug: string): string {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

// Os estabelecimentos do Bistro são os nós "slug__<nome>" (onde vive o cadastro
// e o valor do plano). O resto ("gestaoCompany_...", "gestaoMaster_...") é dado
// interno do app, não é cliente. Varre topo e um nível abaixo, dedup por slug.
export async function getBistroEstabelecimentos(): Promise<{ slug: string; nome: string; dados: Record<string, any> }[] | null> {
  const root = await readRoot();
  if (root === null) return null;
  if (!root || typeof root !== "object") return [];
  const achados = new Map<string, any>();
  const add = (key: string, val: any) => {
    if (/^slug__/.test(key)) {
      const slug = key.replace(/^slug__/, "");
      if (!achados.has(slug)) achados.set(slug, val);
    }
  };
  for (const [k, v] of Object.entries(root)) {
    add(k, v);
    if (v && typeof v === "object") for (const [k2, v2] of Object.entries(v as any)) add(k2, v2);
  }
  return [...achados.entries()]
    .filter(([slug]) => !/teste|__test|demo/i.test(slug))
    .map(([slug, val]) => ({
      slug,
      nome: bonito(slug),
      dados: val && typeof val === "object" ? safeDoc(slug, val) : { id: slug, valor: val },
    }));
}

// Conta as "contas" do Bistro = nº de estabelecimentos (nós slug__).
export async function getContagemContasBistro(): Promise<{ n: number | null; candidatos: string[] }> {
  const est = await getBistroEstabelecimentos();
  if (est === null) return { n: null, candidatos: [] };
  return { n: est.length, candidatos: est.map((e) => e.nome) };
}

// Clientes do Bistro para a lista unificada = os estabelecimentos (limpos).
export async function getFirebaseClientDocs(): Promise<{ colecao: string; rows: any[] }[] | null> {
  const est = await getBistroEstabelecimentos();
  if (est === null) return null;
  const rows = est.map((e) => ({ ...e.dados, nome: e.nome }));
  return rows.length ? [{ colecao: "estabelecimentos", rows }] : [];
}
