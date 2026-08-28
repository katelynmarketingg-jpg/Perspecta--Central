import { supabaseConfigured, getProjectDbSizeMb } from "./integrations/supabase";
import { firebaseConfigured, getFirebaseSizeMb } from "./integrations/firebase";
import { renderConfigured, getRenderCustos } from "./integrations/render";
import { CAMBIO_USD_BRL } from "./precos";

// "Quando vira conta": para cada serviço, o limite do plano grátis, o uso ao
// vivo, o que já custa hoje (atual) e o que vai custar quando entrar no pacote
// pago (previsto). Todo limite/preço carrega FONTE + DATA conferida.

const GB = 1024; // MB
const usd = (u: number) => u * CAMBIO_USD_BRL;

export type Gatilho = {
  servico: string;
  usadoMb: number | null;
  limiteMb: number | null;
  estado: "ok" | "perto" | "passou" | "pago" | "medir";
  mensagem: string;
  aoPassar?: string;
  custoAtualBrl: number;    // o que você paga hoje por este serviço
  custoPrevistoBrl: number; // o que vai pagar quando entrar no pacote pago
  pacote: string;           // nome do pacote pago
  fonte: string;
  conferido: string;
};

const CONFERIDO = "2026-08-28";

export async function getGatilhos(): Promise<Gatilho[]> {
  let supaRef: string | null = null;
  if (supabaseConfigured()) {
    const sistemas = await (await import("./data")).getSistemas();
    supaRef = sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;
  }

  const [supaMb, fireMb, renderRes] = await Promise.all([
    supaRef && supabaseConfigured() ? getProjectDbSizeMb(supaRef) : Promise.resolve(null),
    firebaseConfigured() ? getFirebaseSizeMb() : Promise.resolve(null),
    renderConfigured() ? getRenderCustos() : Promise.resolve({ custos: null }),
  ]);

  const out: Gatilho[] = [];

  // Supabase — Free 500 MB de banco → Pro US$ 25/mês (inclui 8 GB).
  out.push(barra({
    servico: "Supabase — banco (Commerce + Juris)",
    usadoMb: supaMb, limiteMb: 500,
    pacote: "Supabase Pro", custoPrevistoBrl: usd(25),
    aoPassar: "Supabase Pro US$ 25/mês (inclui 8 GB)", fonte: "supabase.com/pricing",
  }));

  // Firebase — Spark 1 GB → Blaze (pago por uso, sem mensalidade fixa).
  const fireGb = fireMb != null ? fireMb / GB : 0;
  const fireExcedenteUsd = Math.max(0, fireGb - 1) * 5; // ~US$5/GB acima de 1 GB
  out.push(barra({
    servico: "Firebase — Bistro (Realtime DB)",
    usadoMb: fireMb, limiteMb: 1 * GB,
    pacote: "Firebase Blaze (uso)", custoPrevistoBrl: usd(fireExcedenteUsd),
    aoPassar: "Firebase Blaze — pago por uso (~US$ 5/GB acima de 1 GB)", fonte: "firebase.google.com/pricing",
  }));

  // Vercel — Hobby (grátis) → Pro US$ 20/mês. Uso de banda ainda não medido.
  out.push({
    servico: "Vercel — Commerce/Central/Hub (banda)",
    usadoMb: null, limiteMb: 100 * GB, estado: "medir",
    mensagem: "Plano Hobby (grátis). Banda ainda não medida; ao passar de 100 GB/mês → Pro US$ 20/mês.",
    aoPassar: "Vercel Pro US$ 20/mês", custoAtualBrl: 0, custoPrevistoBrl: usd(20),
    pacote: "Vercel Pro", fonte: "vercel.com/pricing", conferido: CONFERIDO,
  });

  // Render — já é pago por serviço (Creator + Juris): atual = previsto.
  const rc = (renderRes as any).custos as { totalUsd: number | null }[] | null;
  if (rc) {
    const totalUsd = rc.reduce((a, c) => a + (c.totalUsd || 0), 0);
    out.push({
      servico: "Render — Creator + Juris (planos)",
      usadoMb: null, limiteMb: null, estado: "pago",
      mensagem: totalUsd > 0 ? `Já é conta fixa: US$ ${totalUsd.toFixed(2)}/mês (≈ ${brl(usd(totalUsd))}).` : "Serviços no plano gratuito do Render.",
      custoAtualBrl: usd(totalUsd), custoPrevistoBrl: usd(totalUsd),
      pacote: "Render (planos)", fonte: "render.com/pricing", conferido: CONFERIDO,
    });
  }

  return out;
}

// Resumo: quanto você paga HOJE e quanto vai pagar quando todos os pacotes
// pagos entrarem (todo o grátis esgotado).
export async function getResumoCusto(): Promise<{ atualBrl: number; previstoBrl: number; itens: Gatilho[] }> {
  const itens = await getGatilhos();
  const atualBrl = itens.reduce((a, g) => a + g.custoAtualBrl, 0);
  const previstoBrl = itens.reduce((a, g) => a + g.custoPrevistoBrl, 0);
  return { atualBrl, previstoBrl, itens };
}

function brl(n: number) { return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function barra(p: {
  servico: string; usadoMb: number | null; limiteMb: number; aoPassar: string;
  fonte: string; pacote: string; custoPrevistoBrl: number;
}): Gatilho {
  const base = {
    servico: p.servico, limiteMb: p.limiteMb, aoPassar: p.aoPassar, fonte: p.fonte, conferido: CONFERIDO,
    pacote: p.pacote, custoAtualBrl: 0, custoPrevistoBrl: p.custoPrevistoBrl,
  };
  if (p.usadoMb == null) return { ...base, usadoMb: null, estado: "medir", mensagem: "Uso ainda não medido." };
  const pct = p.usadoMb / p.limiteMb;
  const faltaMb = Math.max(p.limiteMb - p.usadoMb, 0);
  const fmt = (mb: number) => (mb >= GB ? `${(mb / GB).toFixed(2)} GB` : `${mb.toFixed(0)} MB`);
  if (pct >= 1) return { ...base, usadoMb: p.usadoMb, estado: "passou", mensagem: `Passou do grátis (${fmt(p.usadoMb)} de ${fmt(p.limiteMb)}). Vai virar ${p.aoPassar}.` };
  const estado = pct >= 0.75 ? "perto" : "ok";
  return { ...base, usadoMb: p.usadoMb, estado, mensagem: `Usando ${fmt(p.usadoMb)} de ${fmt(p.limiteMb)} grátis. Faltam ${fmt(faltaMb)} para começar a pagar (${p.aoPassar}).` };
}
