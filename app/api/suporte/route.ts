import { NextResponse } from "next/server";
import { listarTickets, criarTicket, type Categoria, type Prioridade } from "@/lib/suporte";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ tickets: await listarTickets() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { assunto, categoria, prioridade, sistemaId, empresaRef, mensagem, anexoBase64, anexoNome } = body as {
    assunto: string; categoria: Categoria; prioridade: Prioridade;
    sistemaId: string | null; empresaRef: string | null; mensagem: string;
    anexoBase64?: string | null; anexoNome?: string | null;
  };
  const r = await criarTicket({ assunto, categoria, prioridade, sistemaId: sistemaId || null, empresaRef: empresaRef || null, mensagem, anexoBase64, anexoNome });
  if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível criar o chamado." }, { status: 400 });
  return NextResponse.json({ ok: true, id: r.id });
}
