import admin from "firebase-admin";

// Integração com o Firebase (Bistro) via conta de serviço.
// Enquanto FIREBASE_SERVICE_ACCOUNT não estiver setado, o Central usa mock.

export function firebaseConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
}

function getApp(): admin.app.App | null {
  if (!firebaseConfigured()) return null;
  try {
    if (admin.apps.length) return admin.app();
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string);
    return admin.initializeApp({ credential: admin.credential.cert(sa) });
  } catch {
    return null;
  }
}

// Diagnóstico: diz se o Firebase conectou de verdade (e por que não, se falhar).
export async function firebaseStatus(): Promise<{ configurado: boolean; ok: boolean; colecoes: number; erro?: string }> {
  if (!firebaseConfigured()) return { configurado: false, ok: false, colecoes: 0 };
  try {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string);
    const app = admin.apps.length ? admin.app() : admin.initializeApp({ credential: admin.credential.cert(sa) });
    const cols = await admin.firestore(app).listCollections();
    return { configurado: true, ok: true, colecoes: cols.length };
  } catch (e: any) {
    const msg = String(e?.message || e || "falha");
    return { configurado: true, ok: false, colecoes: 0, erro: msg.slice(0, 140) };
  }
}

// Converte um documento do Firestore em objeto seguro para exibir (datas viram ISO).
function safeDoc(id: string, data: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = { id };
  for (const [k, v] of Object.entries(data || {})) {
    if (v == null) out[k] = v;
    else if (typeof v === "object") {
      if (typeof (v as any).toDate === "function") out[k] = (v as any).toDate().toISOString();
      else {
        try { out[k] = JSON.stringify(v); } catch { out[k] = "[obj]"; }
      }
    } else out[k] = v;
  }
  return out;
}

// Lê os documentos das coleções que representam clientes do Bistro (até 50).
// Prioriza coleções com nome tipo clients/customers/empresas; se nenhuma bater,
// devolve as coleções não vazias.
export async function getFirestoreClientDocs(): Promise<{ colecao: string; rows: any[] }[] | null> {
  const app = getApp();
  if (!app) return null;
  try {
    const db = admin.firestore(app);
    const cols = await db.listCollections();
    const nomeCliente = /client|customer|empresa|cliente|tenant|company|conta|account/i;
    let alvo = cols.filter((c) => nomeCliente.test(c.id));
    if (alvo.length === 0) alvo = cols.slice(0, 10);
    const results = await Promise.all(
      alvo.map(async (col) => {
        const snap = await col.limit(50).get();
        return snap.empty ? null : { colecao: col.id, rows: snap.docs.map((d) => safeDoc(d.id, d.data())) };
      })
    );
    return results.filter(Boolean) as { colecao: string; rows: any[] }[];
  } catch {
    return null;
  }
}

// Lista as coleções raiz do Firestore com uma amostra de documentos — para
// descobrir onde estão os clientes (ex.: a Aliança) do Bistro.
export async function findFirestoreCollections(): Promise<{ colecao: string; amostra: any[] }[] | null> {
  const app = getApp();
  if (!app) return null;
  try {
    const db = admin.firestore(app);
    const cols = await db.listCollections();
    const results = await Promise.all(
      cols.slice(0, 30).map(async (col) => {
        const snap = await col.limit(3).get();
        return snap.empty ? null : { colecao: col.id, amostra: snap.docs.map((d) => safeDoc(d.id, d.data())) };
      })
    );
    return results.filter(Boolean) as { colecao: string; amostra: any[] }[];
  } catch {
    return null;
  }
}
