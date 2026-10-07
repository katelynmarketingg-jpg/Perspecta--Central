import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { salvarLimiteEmpresa } from "@/lib/sistema-detalhes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Salva o limite de armazenamento (GB) que a dona define para UMA empresa de
// um sistema. Fica atrás do login do Central.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { sistemaId, empresa, limiteGb } = body as Record<string, any>;
  if (!sistemaId || !empresa) return NextResponse.json({ error: "Informe sistema e empresa." }, { status: 400 });
  const r = await salvarLimiteEmpresa(String(sistemaId), String(empresa), limiteGb === "" || limiteGb == null ? null : Number(limiteGb));
  if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível salvar." }, { status: 400 });
  revalidateTag("sistemas-detalhes");
  return NextResponse.json({ ok: true });
}
