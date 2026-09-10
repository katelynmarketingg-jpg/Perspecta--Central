import { NextResponse } from "next/server";
import { getSistemas } from "@/lib/data";
import { supabaseConfigured, supabaseStatus, runSupabaseQuery } from "@/lib/integrations/supabase";
import { listarConvites } from "@/lib/convites";
import { listarLoginsRecentes } from "@/lib/seguranca";
import { listarPlanosCentral } from "@/lib/planos-central";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// DIAGNÓSTICO TEMPORÁRIO — confirma se o token do schema central voltou. Remover depois.
export async function GET() {
  const sistemas = await getSistemas().catch(() => null);
  const ref = Array.isArray(sistemas) ? sistemas.find((s: any) => s.supabaseRef)?.supabaseRef || null : null;
  const sbSt = ref && supabaseConfigured() ? await supabaseStatus(ref).catch((e) => ({ erro: String(e) })) : { off: true };
  const tabelasCentral = ref ? await runSupabaseQuery(ref, "select count(*)::int as n from information_schema.tables where table_schema = 'central';").catch(() => null) : null;
  const [convites, logins, planos] = await Promise.all([
    listarConvites().catch((e) => ({ erro: String(e) }) as any),
    listarLoginsRecentes(5).catch((e) => ({ erro: String(e) }) as any),
    listarPlanosCentral().catch((e) => ({ erro: String(e) }) as any),
  ]);
  return NextResponse.json({
    ref,
    supabaseStatus: sbSt,
    tabelasNoCentral: Array.isArray(tabelasCentral) ? tabelasCentral[0]?.n ?? null : null,
    convites: Array.isArray(convites) ? convites.length : convites,
    loginsRecentes: Array.isArray(logins) ? logins.length : logins,
    planosCentral: Array.isArray(planos) ? planos.length : planos,
  });
}
