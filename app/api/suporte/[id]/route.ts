import { NextResponse } from "next/server";
import { atualizarStatusTicket, type StatusTicket } from "@/lib/suporte";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body?.status) return NextResponse.json({ error: "Informe o status." }, { status: 400 });
  const r = await atualizarStatusTicket(params.id, body.status as StatusTicket);
  if (!r.ok) return NextResponse.json({ error: "Não foi possível atualizar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
