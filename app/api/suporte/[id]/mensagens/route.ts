import { NextResponse } from "next/server";
import { adicionarMensagem } from "@/lib/suporte";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { autor, texto, anexoBase64, anexoNome } = body as { autor?: string; texto: string; anexoBase64?: string | null; anexoNome?: string | null };
  const r = await adicionarMensagem(params.id, { autor: autor || "Você", texto, anexoBase64, anexoNome });
  if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível enviar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
