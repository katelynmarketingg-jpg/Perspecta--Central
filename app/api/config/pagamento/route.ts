import { NextResponse } from "next/server";
import { getProvedorAtivoId, setProvedorAtivo, TODOS_PROVEDORES, type ProviderId } from "@/lib/integrations/payments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ADMINISTRATIVA — atrás do login do Central. Troca qual provedor de
// pagamento está ativo agora (InfinitePay, Mercado Pago ou Asaas).
export async function GET() {
  return NextResponse.json({
    ativo: await getProvedorAtivoId(),
    provedores: TODOS_PROVEDORES.map((p) => ({ id: p.id, nome: p.nome, configurado: p.configured() })),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const id = body?.provider as ProviderId;
  if (!id) return NextResponse.json({ error: "Informe o provedor." }, { status: 400 });
  const r = await setProvedorAtivo(id);
  if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível salvar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
