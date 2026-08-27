import { NextResponse } from "next/server";
import { getCreatorUsers, criarUsuarioCreator, acaoUsuarioCreator, type AcaoUsuario } from "@/lib/integrations/creator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Logins dentro de um escritório do Creator. Senhas só são repassadas à API do
// Creator (bcrypt) — nunca gravadas nem logadas aqui.

// GET ?org=<id> — lista os logins do escritório.
export async function GET(req: Request) {
  const org = Number(new URL(req.url).searchParams.get("org"));
  if (!org) return NextResponse.json({ error: "Informe o escritório." }, { status: 400 });
  const r = await getCreatorUsers(org);
  if (r.users === null) return NextResponse.json({ error: r.erro || "Não foi possível listar." }, { status: 400 });
  return NextResponse.json({ users: r.users });
}

// POST — cria um login novo no escritório.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { org, nome, usuario, senha, papel } = body as Record<string, any>;
  if (!org) return NextResponse.json({ error: "Informe o escritório." }, { status: 400 });
  const r = await criarUsuarioCreator(Number(org), { nome, usuario, senha, papel });
  if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível criar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// PATCH — resetar senha, ativar/desativar, excluir um login.
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { acao, org, id, senha } = body as { acao: AcaoUsuario; org: number; id: number; senha?: string };
  if (!acao || !org || !id) return NextResponse.json({ error: "Informe ação, escritório e login." }, { status: 400 });
  const r = await acaoUsuarioCreator(acao, Number(org), Number(id), senha);
  if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível concluir." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
