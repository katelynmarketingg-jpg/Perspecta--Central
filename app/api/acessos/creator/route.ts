import { NextResponse } from "next/server";
import { criarEscritorioCreator } from "@/lib/integrations/creator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Cria um escritório + login admin no Perspecta Creator, a partir do Central.
// A senha vem no corpo só para ser repassada à API do Creator (que a criptografa
// com bcrypt) — nunca é gravada nem logada aqui.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { nome, adminUsuario, adminSenha, adminNome, whatsapp } = body as Record<string, string>;
  const r = await criarEscritorioCreator({ nome, adminUsuario, adminSenha, adminNome, whatsapp });
  if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível criar." }, { status: 400 });
  return NextResponse.json({ ok: true, id: r.id });
}
