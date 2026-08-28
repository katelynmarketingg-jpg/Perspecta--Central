import { NextResponse } from "next/server";
import { listarConvites, criarConvite, cancelarConvite } from "@/lib/convites";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Rotas ADMINISTRATIVAS (ficam atrás do login do Central) para gerar e listar
// convites de primeiro acesso. O cliente usa /api/convites/aceitar e
// /api/convites/pagamento, que são públicas (sem login).
export async function GET() {
  return NextResponse.json({ convites: await listarConvites() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { sistemaId, planoId, empresaNome, email, whatsapp, trialDias } = body as Record<string, string>;
  const r = await criarConvite({ sistemaId, planoId, empresaNome, email, whatsapp: whatsapp || null, trialDias: trialDias ? Number(trialDias) : undefined });
  if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível gerar o convite." }, { status: 400 });
  return NextResponse.json({ ok: true, token: r.token });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Informe o id." }, { status: 400 });
  const r = await cancelarConvite(id);
  if (!r.ok) return NextResponse.json({ error: "Não foi possível cancelar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
