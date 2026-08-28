import { supabaseConfigured, getProjectDbSizeMb } from "./integrations/supabase";
import { firebaseConfigured, getFirebaseSizeMb } from "./integrations/firebase";
import { renderConfigured, getRenderCustos } from "./integrations/render";
import { CAMBIO_USD_BRL } from "./precos";

// "Quando vira conta": para cada serviço, o limite do plano grátis, o uso ao
// vivo e o que passa a custar ao ultrapassar. Todo limite carrega FONTE + DATA
// conferida — número de custo sem procedência é chute.

const GB = 1024; // MB

export type Gatilho = {
  servico: string;
  usadoMb: number | null;   // uso atual (quando mensurável)
  limiteMb: number | null;  // limite do plano grátis
  estado: "ok" | "perto" | "passou" | "pago" | "medir";
  mensagem: string;
  aoPassar?: string;        // o que passa a custar
  jaCustaBrl?: number;      // quando já é pago (Render)
  fonte: string;
  conferido: string;        // AAAA-MM-DD
};

const CONFERIDO = "2026-08-28";

export async function getGatilhos(): Promise<Gatilho[]> {
  // Pega o ref do projeto Supabase compartilhado.
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

  // Supabase — plano Free: 500 MB de banco. Ao passar → Pro US$25/mês.
  out.push(barra({
    servico: "Supabase — banco (Commerce + Juris)",
    usadoMb: supaMb, limiteMb: 500,
    aoPassar: "Supabase Pro US$ 25/mês (inclui 8 GB)",
    fonte: "supabase.com/pricing",
  }));

  // Firebase — Spark: 1 GB armazenado no Realtime Database. Ao passar → Blaze.
  out.push(barra({
    servico: "Firebase — Bistro (Realtime DB)",
    usadoMb: fireMb, limiteMb: 1 * GB,
    aoPassar: "Firebase Blaze — pago por uso (~US$ 5/GB armazenado)",
    fonte: "firebase.google.com/pricing",
  }));

  // Vercel — Hobby: 100 GB de banda/mês. Uso não medido no app ainda.
  out.push({
    servico: "Vercel — Commerce/Central/Hub (banda)",
    usadoMb: null, limiteMb: 100 * GB, estado: "medir",
    mensagem: "Plano Hobby (grátis). Uso de banda ainda não medido no Central; ao passar de 100 GB/mês → Pro US$ 20/mês.",
    aoPassar: "Vercel Pro US$ 20/mês", fonte: "vercel.com/pricing", conferido: CONFERIDO,
  });

  // Render — já é pago por serviço (Creator + Juris): mostra o custo atual.
  const rc = (renderRes as any).custos as { totalUsd: number | null }[] | null;
  if (rc) {
    const totalUsd = rc.reduce((a, c) => a + (c.totalUsd || 0), 0);
    out.push({
      servico: "Render — Creator + Juris (planos)",
      usadoMb: null, limiteMb: null, estado: "pago",
      mensagem: totalUsd > 0 ? `Já é conta fixa: US$ ${totalUsd.toFixed(2)}/mês (≈ R$ ${(totalUsd * CAMBIO_USD_BRL).toFixed(2)}) somando os serviços no Render.` : "Serviços no plano gratuito do Render.",
      jaCustaBrl: totalUsd * CAMBIO_USD_BRL, fonte: "render.com/pricing", conferido: CONFERIDO,
    });
  }

  return out;
}

function barra(p: { servico: string; usadoMb: number | null; limiteMb: number; aoPassar: string; fonte: string }): Gatilho {
  const base = { servico: p.servico, limiteMb: p.limiteMb, aoPassar: p.aoPassar, fonte: p.fonte, conferido: CONFERIDO };
  if (p.usadoMb == null) {
    return { ...base, usadoMb: null, estado: "medir", mensagem: "Uso ainda não medido." };
  }
  const pct = p.usadoMb / p.limiteMb;
  const faltaMb = Math.max(p.limiteMb - p.usadoMb, 0);
  const fmt = (mb: number) => (mb >= GB ? `${(mb / GB).toFixed(2)} GB` : `${mb.toFixed(0)} MB`);
  if (pct >= 1) {
    return { ...base, usadoMb: p.usadoMb, estado: "passou", mensagem: `Passou do grátis (${fmt(p.usadoMb)} de ${fmt(p.limiteMb)}). Vai virar ${p.aoPassar}.` };
  }
  const estado = pct >= 0.75 ? "perto" : "ok";
  return {
    ...base, usadoMb: p.usadoMb, estado,
    mensagem: `Usando ${fmt(p.usadoMb)} de ${fmt(p.limiteMb)} grátis. Faltam ${fmt(faltaMb)} para começar a pagar (${p.aoPassar}).`,
  };
}
