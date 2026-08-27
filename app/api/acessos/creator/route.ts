import { NextResponse } from "next/server";
import { criarEscritorioCreator, acaoEscritorioCreator, type AcaoEscritorio } from "@/lib/integrations/creator";

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

// Edita um escritório: estender trial, ativar/desativar, excluir.
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { acao, id, dias } = body as { acao: AcaoEscritorio; id: number; dias?: number };
  if (!acao || !id) return NextResponse.json({ error: "Informe a ação e o escritório." }, { status: 400 });

  const r = await acaoEscritorioCreator(acao, Number(id), dias ? Number(dias) : undefined);
  if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível concluir a ação." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
