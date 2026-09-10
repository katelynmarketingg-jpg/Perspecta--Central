import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// DIAGNÓSTICO TEMPORÁRIO — cronometra cada leitura pra achar o gargalo. Remover depois.
async function t<T>(nome: string, fn: () => Promise<T>): Promise<{ nome: string; ms: number; ok: boolean; n?: number }> {
  const t0 = Date.now();
  try {
    const r: any = await fn();
    const n = Array.isArray(r) ? r.length : r == null ? 0 : undefined;
    return { nome, ms: Date.now() - t0, ok: true, n };
  } catch (e: any) {
    return { nome, ms: Date.now() - t0, ok: false };
  }
}

export async function GET() {
  const data = await import("@/lib/data");
  const conv = await import("@/lib/convites");
  const cli = await import("@/lib/clientes");
  const sb = await import("@/lib/integrations/supabase");
  const cre = await import("@/lib/integrations/creator");
  const jur = await import("@/lib/integrations/juris");
  const com = await import("@/lib/integrations/commerce");

  const sistemas = await data.getSistemas().catch(() => [] as any[]);
  const ref = (sistemas as any[]).find((s) => s.supabaseRef)?.supabaseRef || null;

  // Uma por vez, em série, pra ver o custo real de cada uma.
  const passos = [] as any[];
  passos.push(await t("1 runSupabaseQuery (1 select trivial)", () => ref ? sb.runSupabaseQuery(ref, "select 1 as x;") : Promise.resolve(null)));
  passos.push(await t("getSistemas (catálogo + saúde por sistema)", () => data.getSistemas()));
  passos.push(await t("listarConvites", () => conv.listarConvites()));
  passos.push(await t("getClientesUnificados", () => cli.getClientesUnificados()));
  passos.push(await t("creatorStatus", () => cre.creatorStatus()));
  passos.push(await t("jurisStatus", () => jur.jurisStatus()));
  passos.push(await t("listarEscritoriosJuris", () => jur.listarEscritoriosJuris()));
  passos.push(await t("commerceStatus", () => com.commerceStatus()));
  passos.push(await t("listarLojasCommerce", () => com.listarLojasCommerce()));

  const totalSerie = passos.reduce((a, p) => a + p.ms, 0);
  return NextResponse.json({ ref, totalSerieMs: totalSerie, passos });
}
