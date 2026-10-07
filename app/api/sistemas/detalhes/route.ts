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
  const { sistemaId, limiteGb, custoPorGbBrl, tokenNome, tokenExpira, tokenExpiraEm } = body as Record<string, any>;
  if (!sistemaId) return NextResponse.json({ error: "Informe o sistema." }, { status: 400 });
  const r = await salvarDetalhe({
    sistemaId: String(sistemaId),
    limiteGb: limiteGb === "" || limiteGb == null ? null : Number(limiteGb),
    custoPorGbBrl: custoPorGbBrl === "" || custoPorGbBrl == null ? null : Number(custoPorGbBrl),
    tokenNome: tokenNome ? String(tokenNome) : null,
    tokenExpira: Boolean(tokenExpira),
    tokenExpiraEm: tokenExpiraEm ? String(tokenExpiraEm) : null,
  });
  if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível salvar." }, { status: 400 });
  revalidateTag("sistemas-detalhes");
  return NextResponse.json({ ok: true });
}
