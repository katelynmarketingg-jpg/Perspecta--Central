import { NextResponse } from "next/server";
import { criarLojaCommerce } from "@/lib/integrations/commerce";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Cria uma loja + usuário admin no Perspecta Commerce, direto do Central.
// A senha vem no corpo só para ser repassada ao Supabase do Commerce — nunca é
// gravada nem logada aqui.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { nomeLoja, adminUsuario, senha } = body as Record<string, string>;
  const r = await criarLojaCommerce({ nomeLoja, adminUsuario, senha });
  if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível criar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
