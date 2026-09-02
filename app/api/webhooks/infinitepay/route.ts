import { NextResponse } from "next/server";
import { getConvitePorToken, confirmarPagamento, listarConvites } from "@/lib/convites";
import { registrarEvento, marcarProcessado } from "@/lib/webhooks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PÚBLICA — é a InfinitePay quem chama isso, não um sistema Perspecta. Corpo
// no formato deles: { order_nsu, paid_amount, amount, transaction_nsu }.
// order_nsu = "conv_<id do convite>" (é o que a gente manda ao gerar o link
// em lib/integrations/payments/infinitepay.ts). Confirma o pagamento do
// convite quando o valor pago bate com o esperado.
export async function POST(req: Request) {
  let body: { order_nsu?: string; paid_amount?: number; amount?: number; transaction_nsu?: string | number } = {};
  try { body = await req.json(); } catch { /* corpo vazio/inválido: responde 200 mesmo assim */ }

  const orderNsu = body.order_nsu || "";
  const m = /^conv_(.+)$/.exec(orderNsu);
  if (!m) return NextResponse.json({ success: true }); // não é nosso pedido — ignora

  const idempotencyKey = body.transaction_nsu ? `infinitepay_${body.transaction_nsu}` : `infinitepay_${orderNsu}_${Date.now()}`;
  const reg = await registrarEvento("infinitepay", "pagamento.confirmado", body, idempotencyKey, true);
  if (reg.duplicado) return NextResponse.json({ success: true });

  try {
    const convites = await listarConvites();
    const convite = convites.find((c) => c.id === m[1]);
    if (!convite) { await marcarProcessado(idempotencyKey, "convite não encontrado"); return NextResponse.json({ success: true }); }

    const r = await confirmarPagamento(convite.token, "infinitepay", body.transaction_nsu ? String(body.transaction_nsu) : undefined);
    await marcarProcessado(idempotencyKey, r.ok ? undefined : r.erro);
  } catch (e: any) {
    await marcarProcessado(idempotencyKey, e?.message || "erro ao processar");
  }
  return NextResponse.json({ success: true });
}
