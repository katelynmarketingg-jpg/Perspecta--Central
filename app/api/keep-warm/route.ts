import { NextResponse } from "next/server";
import { fetchT } from "@/lib/fetch-timeout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Mantém o Render acordado: um monitor externo (ex.: cron-job.org, grátis)
// chama esta URL a cada ~5 min, e ela dá um "oi" no Creator e no Juris pra eles
// não dormirem. Serviço acordado = painel rápido. Pública de propósito (não
// expõe nada; só faz um GET nas URLs base dos serviços).
async function ping(url: string | undefined): Promise<{ url: string | null; ok: boolean; status?: number; ms: number }> {
  if (!url) return { url: null, ok: false, ms: 0 };
  const base = url.replace(/\/+$/, "");
  const t0 = Date.now();
  try {
    const res = await fetchT(base, { cache: "no-store" }, 45000);
    return { url: base, ok: true, status: res.status, ms: Date.now() - t0 };
  } catch {
    return { url: base, ok: false, ms: Date.now() - t0 };
  }
}

export async function GET() {
  const [creator, juris] = await Promise.all([
    ping(process.env.CREATOR_API_URL),
    ping(process.env.JURIS_API_URL),
  ]);
  return NextResponse.json({ ok: true, quando: new Date().toISOString(), creator, juris });
}
