import { NextResponse } from "next/server";
import { criarAssinaturaRecorrente } from "@/lib/integrations/mercadopago";
import { planById, sysById } from "@/lib/data";

// Recebe um cadastro de cliente novo e cria a assinatura recorrente.
// IMPORTANTE: o corpo traz apenas um TOKEN de cartão gerado no navegador —
// o número do cartão nunca chega aqui. Sem a chave do Mercado Pago, roda simulado.
export const TRIAL_DIAS = 14;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { empresa, email, sis, plano, cardToken } = body as Record<string, string>;
  if (!empresa || !email || !sis || !plano) {
    return NextResponse.json({ error: "Preencha empresa, e-mail, sistema e plano." }, { status: 400 });
  }

  const p = planById(plano);
  const s = sysById(sis);
  if (!p || !s) return NextResponse.json({ error: "Sistema ou plano inválido." }, { status: 400 });

  const externalRef = `cad_${sis}_${Date.now()}`;
  const sub = await criarAssinaturaRecorrente({
    emailPagador: email,
    valor: p.valor,
    cardTokenId: cardToken || "",
    externalRef,
  });

  const trialAte = new Date(Date.now() + TRIAL_DIAS * 86400000);

  return NextResponse.json({
    ok: sub.ok,
    simulado: sub.simulado ?? false,
    preapprovalId: sub.preapprovalId,
    trialDias: TRIAL_DIAS,
    trialAte: trialAte.toISOString(),
    sistema: s.nome,
    plano: p.nome,
    valor: p.valor,
  });
}
