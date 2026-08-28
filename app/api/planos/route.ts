import { NextResponse } from "next/server";
import { listarPlanosCentral, addPlanoCentral, removerPlanoCentral } from "@/lib/planos-central";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ planos: await listarPlanosCentral() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { sistemaId, nome, logins, gb, produtos, preco } = body as any;
  const r = await addPlanoCentral({
    sistemaId, nome, logins: Number(logins) || 0, gb: Number(gb) || 0,
    produtos: produtos == null || produtos === "" ? null : Number(produtos), preco: Number(preco) || 0,
  });
  if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível salvar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Informe o id." }, { status: 400 });
  const r = await removerPlanoCentral(id);
  if (!r.ok) return NextResponse.json({ error: "Não foi possível remover." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
