import { NextResponse } from "next/server";
import { fetchT } from "@/lib/fetch-timeout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Mantém o painel rápido de duas formas, chamado por um monitor externo
// (cron-job.org) a cada ~5 min:
//  1) acorda o Render (Creator/Juris) pra não dormir;
//  2) "esquenta" o cache de dados do Central (as leituras pesadas rodam aqui,
//     no fundo, e ficam prontas — então quando VOCÊ abre uma página, ela pega
//     tudo do cache quente, rápido, em vez de esperar 10-18s de consulta).
// Pública de propósito (não expõe nada; só dispara leituras e pings).
async function ping(url: string | undefined): Promise<{ url: string | null; ok: boolean; ms: number }> {
  if (!url) return { url: null, ok: false, ms: 0 };
  const base = url.replace(/\/+$/, "");
  const t0 = Date.now();
  try {
    await fetchT(base, { cache: "no-store" }, 45000);
    return { url: base, ok: true, ms: Date.now() - t0 };
  } catch {
    return { url: base, ok: false, ms: Date.now() - t0 };
  }
}

async function aquecer(): Promise<Record<string, number>> {
  const data = await import("@/lib/data");
  const conv = await import("@/lib/convites");
  const cli = await import("@/lib/clientes");
  const gat = await import("@/lib/gatilhos");
  const seg = await import("@/lib/seguranca");
  const sup = await import("@/lib/suporte");
  const ter = await import("@/lib/termos");
  const cup = await import("@/lib/cupons");
  const des = await import("@/lib/despesas");
  const pln = await import("@/lib/planos-central");
  const uso = await import("@/lib/uso-consumo");
  const tarefas: [string, Promise<any>][] = [
    ["sistemas", data.getSistemas()],
    ["empresas", data.getEmpresas()],
    ["pagamentos", data.getPagamentos()],
    ["custos", data.getCustos()],
    ["convites", conv.listarConvites()],
    ["clientes", cli.getClientesUnificados()],
    ["gatilhos", gat.getResumoCusto()],
    ["alertas", seg.listarAlertasReais()],
    ["logins", seg.resumoLoginsPorSistema()],
    ["tickets", sup.listarTickets()],
    ["termos", ter.listarTermos()],
    ["cupons", cup.listarCupons()],
    ["despesas", des.listarDespesas()],
    ["planos", pln.listarPlanosCentral()],
    ["uso", uso.ultimoUsoPorEmpresa()],
  ];
  const out: Record<string, number> = {};
  await Promise.all(tarefas.map(async ([nome, p]) => {
    const t0 = Date.now();
    try { await p; } catch {}
    out[nome] = Date.now() - t0;
  }));
  return out;
}

export async function GET() {
  const [creator, juris, aquecimento] = await Promise.all([
    ping(process.env.CREATOR_API_URL),
    ping(process.env.JURIS_API_URL),
    aquecer(),
  ]);
  return NextResponse.json({ ok: true, quando: new Date().toISOString(), creator, juris, aquecimento });
}
