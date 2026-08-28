import { NextResponse } from "next/server";
import { getConvitePorToken, confirmarPagamento } from "@/lib/convites";
import { criarAssinaturaRecorrente } from "@/lib/integrations/mercadopago";
import { planById } from "@/lib/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PÚBLICA — sem login. O cliente cai aqui quando o teste grátis acaba (ou
// antes, se quiser adiantar) pra colocar a forma de pagamento self-serviço.
// Só recebe o TOKEN do cartão gerado no navegador — o número nunca chega aqui.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.token) return NextResponse.json({ error: "Convite inválido." }, { status: 400 });
  const c = await getConvitePorToken(String(body.token));
  if (!c) return NextResponse.json({ error: "Convite não encontrado." }, { status: 404 });
  if (c.status === "ativo") return NextResponse.json({ error: "Este acesso já está com pagamento confirmado." }, { status: 400 });
  if (c.status === "pendente") return NextResponse.json({ error: "Aceite os termos de uso primeiro." }, { status: 400 });

  const plano = planById(c.planoId);
  if (!plano) return NextResponse.json({ error: "Plano não encontrado." }, { status: 400 });

  const sub = await criarAssinaturaRecorrente({
    emailPagador: c.email,
    valor: plano.valor,
    cardTokenId: String(body.cardToken || ""),
    externalRef: `conv_${c.id}`,
  });

  const r = await confirmarPagamento(c.token);
  if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível confirmar o pagamento." }, { status: 400 });
  return NextResponse.json({ ok: true, simulado: sub.simulado ?? false, valor: plano.valor });
}
