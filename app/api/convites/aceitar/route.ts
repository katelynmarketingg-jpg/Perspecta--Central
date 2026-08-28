import { NextResponse } from "next/server";
import { aceitarTermos } from "@/lib/convites";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PÚBLICA — sem login. É aqui que o cliente aceita os termos de uso no
// primeiro acesso e o teste grátis começa a contar.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.token) return NextResponse.json({ error: "Convite inválido." }, { status: 400 });
  const r = await aceitarTermos(String(body.token));
  if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível confirmar." }, { status: 400 });
  return NextResponse.json({ ok: true, trialAte: r.trialAte, trialDias: r.trialDias });
}
