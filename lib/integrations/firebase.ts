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
    const out: { colecao: string; rows: any[] }[] = [];
    for (const col of alvo) {
      const snap = await col.limit(50).get();
      if (snap.empty) continue;
      out.push({ colecao: col.id, rows: snap.docs.map((d) => safeDoc(d.id, d.data())) });
    }
    return out;
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
    const out: { colecao: string; amostra: any[] }[] = [];
    for (const col of cols.slice(0, 30)) {
      const snap = await col.limit(3).get();
      if (snap.empty) continue;
      out.push({ colecao: col.id, amostra: snap.docs.map((d) => safeDoc(d.id, d.data())) });
    }
    return out;
  } catch {
    return null;
  }
}
