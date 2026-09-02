import { NextResponse } from "next/server";
import { getConvitePorToken, confirmarPagamento } from "@/lib/convites";
import { getProvedorAtivo } from "@/lib/integrations/payments";
import { planById } from "@/lib/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PÚBLICA — sem login. O cliente cai aqui quando o teste grátis acaba (ou
// antes, se quiser adiantar) pra colocar a forma de pagamento self-serviço.
// Usa o provedor ativo (InfinitePay, Mercado Pago ou Asaas — escolhido em
// Configurações). Mercado Pago só recebe o TOKEN já gerado no navegador;
// Asaas recebe os dados do cartão direto (API dele é PCI pra isso).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.token) return NextResponse.json({ error: "Convite inválido." }, { status: 400 });
  const c = await getConvitePorToken(String(body.token));
  if (!c) return NextResponse.json({ error: "Convite não encontrado." }, { status: 404 });
  if (c.status === "ativo") return NextResponse.json({ error: "Este acesso já está com pagamento confirmado." }, { status: 400 });
  if (c.status === "pendente") return NextResponse.json({ error: "Aceite os termos de uso primeiro." }, { status: 400 });

  const plano = planById(c.planoId);
  if (!plano) return NextResponse.json({ error: "Plano não encontrado." }, { status: 400 });

  const provider = await getProvedorAtivo();
  const sub = await provider.criarAssinatura({
    nomeCliente: c.empresaNome, email: c.email, valor: plano.valor, externalRef: `conv_${c.id}`,
    nomePlano: plano.nome, mpCardToken: body.mpCardToken, cartao: body.cartao,
    webhookBaseUrl: new URL(req.url).origin,
  });
  if (!sub.ok) return NextResponse.json({ error: sub.erro || "Não foi possível processar o pagamento." }, { status: 400 });

  // InfinitePay: precisa redirecionar pro checkout hospedado deles — o
  // pagamento só é confirmado quando o webhook chegar (ainda não automatizado).
  if (sub.checkoutUrl) {
    return NextResponse.json({ ok: true, redirect: true, checkoutUrl: sub.checkoutUrl, provider: provider.id });
  }

  const r = await confirmarPagamento(c.token, provider.id, sub.externalId);
  if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível confirmar o pagamento." }, { status: 400 });
  return NextResponse.json({ ok: true, simulado: sub.simulado ?? false, valor: plano.valor, provider: provider.id });
}
