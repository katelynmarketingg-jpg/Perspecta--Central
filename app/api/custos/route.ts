import { NextResponse } from "next/server";
import { listarCustosManuais, addCustoManual, removerCustoManual } from "@/lib/custos-manuais";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ custos: await listarCustosManuais() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { nome, valorBrl, sistemaId } = body as { nome: string; valorBrl: number; sistemaId: string | null };
  const r = await addCustoManual(nome, Number(valorBrl), sistemaId || null);
  if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível salvar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Informe o id." }, { status: 400 });
  const r = await removerCustoManual(id);
  if (!r.ok) return NextResponse.json({ error: "Não foi possível remover." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
