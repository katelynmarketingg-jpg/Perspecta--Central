import { NextResponse } from "next/server";
import { listarTermos, salvarTermo } from "@/lib/termos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ termos: await listarTermos() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { sistemaId, texto } = body as { sistemaId: string; texto: string };
  const r = await salvarTermo(sistemaId, texto || "");
  if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível salvar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
