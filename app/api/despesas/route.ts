import { NextResponse } from "next/server";
import { listarDespesas, addDespesa, definirAtivoDespesa, removerDespesa, type TipoDespesa } from "@/lib/despesas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ despesas: await listarDespesas() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { nome, tipo, valorBrl, periodicidadeMeses, parcelasTotal, dataInicio, sistemaId } = body as {
    nome: string; tipo: TipoDespesa; valorBrl: number;
    periodicidadeMeses: number | null; parcelasTotal: number | null; dataInicio: string; sistemaId: string | null;
  };
  const r = await addDespesa({
    nome, tipo, valorBrl: Number(valorBrl),
    periodicidadeMeses: periodicidadeMeses != null ? Number(periodicidadeMeses) : null,
    parcelasTotal: parcelasTotal != null ? Number(parcelasTotal) : null,
    dataInicio, sistemaId: sistemaId || null,
  });
  if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível salvar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { id, ativo } = body as { id: string; ativo: boolean };
  if (!id) return NextResponse.json({ error: "Informe o id." }, { status: 400 });
  const r = await definirAtivoDespesa(id, !!ativo);
  if (!r.ok) return NextResponse.json({ error: "Não foi possível atualizar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Informe o id." }, { status: 400 });
  const r = await removerDespesa(id);
  if (!r.ok) return NextResponse.json({ error: "Não foi possível remover." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
