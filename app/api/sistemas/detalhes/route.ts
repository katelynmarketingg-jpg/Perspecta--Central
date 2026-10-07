import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { salvarDetalhe } from "@/lib/sistema-detalhes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Salva os detalhes editáveis de um sistema (limite de armazenamento, custo por
// GB, token e expiração). Fica atrás do login do Central.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { sistemaId } = body as Record<string, any>;
  if (!sistemaId) return NextResponse.json({ error: "Informe o sistema." }, { status: 400 });
  // Só repassa as chaves que vieram no corpo (atualização parcial — salvar o
  // armazenamento não apaga o token, e vice-versa).
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
  const input: any = { sistemaId: String(sistemaId) };
  const numOrNull = (v: any) => (v === "" || v == null ? null : Number(v));
  if (has("limiteGb")) input.limiteGb = numOrNull(body.limiteGb);
  if (has("custoPorGbBrl")) input.custoPorGbBrl = numOrNull(body.custoPorGbBrl);
  if (has("custoRealPorGbBrl")) input.custoRealPorGbBrl = numOrNull(body.custoRealPorGbBrl);
  if (has("tokenNome")) input.tokenNome = body.tokenNome ? String(body.tokenNome) : null;
  if (has("tokenExpira")) input.tokenExpira = Boolean(body.tokenExpira);
  if (has("tokenExpiraEm")) input.tokenExpiraEm = body.tokenExpiraEm ? String(body.tokenExpiraEm) : null;
  const r = await salvarDetalhe(input);
  if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível salvar." }, { status: 400 });
  revalidateTag("sistemas-detalhes");
  return NextResponse.json({ ok: true });
}
