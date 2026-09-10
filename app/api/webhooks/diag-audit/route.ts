import { NextResponse } from "next/server";
import { getSistemas } from "@/lib/data";
import { creatorStatus, creatorConfigured } from "@/lib/integrations/creator";
import { jurisStatus, jurisConfigured, listarEscritoriosJuris } from "@/lib/integrations/juris";
import { commerceStatus, commerceConfigured, listarLojasCommerce } from "@/lib/integrations/commerce";
import { firebaseStatus, firebaseConfigured } from "@/lib/integrations/firebase";
import { renderStatus, renderConfigured } from "@/lib/integrations/render";
import { supabaseConfigured, supabaseStatus, getContagemContas } from "@/lib/integrations/supabase";
import { vercelConfigured } from "@/lib/integrations/vercel";
import { getClientesUnificados, getContagemPorSistema } from "@/lib/clientes";
import { listarLoginsRecentes, resumoLoginsPorSistema } from "@/lib/seguranca";
import { listarConvites } from "@/lib/convites";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// DIAGNÓSTICO TEMPORÁRIO DE AUDITORIA — sem segredos. Remover depois.
export async function GET() {
  const sistemas = await getSistemas().catch((e) => ({ erro: String(e) }) as any);
  const ref = Array.isArray(sistemas) ? sistemas.find((s: any) => s.supabaseRef)?.supabaseRef || null : null;

  const [creSt, jurSt, comSt, fireSt, renSt, sbSt, contagem, clientes, contagemCli, logins, resumoLogins, convites] = await Promise.all([
    creatorConfigured() ? creatorStatus().catch((e) => ({ erro: String(e) })) : Promise.resolve({ off: true }),
    jurisConfigured() ? jurisStatus().catch((e) => ({ erro: String(e) })) : Promise.resolve({ off: true }),
    commerceConfigured() ? commerceStatus().catch((e) => ({ erro: String(e) })) : Promise.resolve({ off: true }),
    firebaseConfigured() ? firebaseStatus().catch((e) => ({ erro: String(e) })) : Promise.resolve({ off: true }),
    renderConfigured() ? renderStatus().catch((e) => ({ erro: String(e) })) : Promise.resolve({ off: true }),
    ref && supabaseConfigured() ? supabaseStatus(ref).catch((e) => ({ erro: String(e) })) : Promise.resolve({ off: true }),
    ref && supabaseConfigured() ? getContagemContas(ref).catch((e) => ({ erro: String(e) })) : Promise.resolve({ off: true }),
    getClientesUnificados().catch((e) => ({ erro: String(e) }) as any),
    getContagemPorSistema().catch((e) => ({ erro: String(e) })),
    listarLoginsRecentes(20).catch((e) => ({ erro: String(e) }) as any),
    resumoLoginsPorSistema().catch((e) => ({ erro: String(e) })),
    listarConvites().catch((e) => ({ erro: String(e) }) as any),
  ]);

  const [lojasCom, escrJur] = await Promise.all([
    commerceConfigured() ? listarLojasCommerce().catch((e) => ({ erro: String(e) }) as any) : Promise.resolve(null),
    jurisConfigured() ? listarEscritoriosJuris().catch((e) => ({ erro: String(e) }) as any) : Promise.resolve(null),
  ]);

  const cliArr = Array.isArray(clientes) ? clientes : [];
  const clientesPorSistema: Record<string, any[]> = {};
  for (const c of cliArr) (clientesPorSistema[c.sistemaId] ||= []).push(c.nome);

  return NextResponse.json({
    env: { supabase: supabaseConfigured(), vercel: vercelConfigured(), creator: creatorConfigured(), juris: jurisConfigured(), commerce: commerceConfigured(), firebase: firebaseConfigured(), render: renderConfigured() },
    refCompartilhado: ref,
    status: { creator: creSt, juris: jurSt, commerce: comSt, bistro: fireSt, render: renSt, supabaseCompartilhado: sbSt },
    contagemContasSharedSupabase: contagem,
    listagemPorFonteReal: {
      commerceLojas: Array.isArray(lojasCom) ? lojasCom.map((x: any) => x.nome) : lojasCom,
      jurisEscritorios: Array.isArray(escrJur) ? escrJur.map((x: any) => x.nome) : escrJur,
    },
    clientesUnificados: { total: cliArr.length, porSistema: clientesPorSistema, contagem: contagemCli },
    logins: { totalRecentes: Array.isArray(logins) ? logins.length : logins, amostra: Array.isArray(logins) ? logins.slice(0, 5) : logins, resumo24h: resumoLogins },
    convites: Array.isArray(convites) ? { total: convites.length, status: convites.map((c: any) => ({ empresa: c.empresaNome, sistema: c.sistemaId, status: c.status })) } : convites,
  });
}
