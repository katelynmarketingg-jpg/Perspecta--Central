import { NextResponse } from "next/server";
import { getConvitePorToken, registrarLoginCriado } from "@/lib/convites";
import { creatorConfigured, criarEscritorioCreator } from "@/lib/integrations/creator";
import { jurisConfigured, criarEscritorioJuris } from "@/lib/integrations/juris";
import { commerceConfigured, criarLojaCommerce } from "@/lib/integrations/commerce";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SISTEMAS_AUTOMATICOS = ["creator", "juris", "commerce"];

// PÚBLICA — sem login. O cliente cai aqui logo depois de aceitar os termos,
// no primeiro acesso, pra escolher usuário/senha e já sair com o login
// criado de verdade. Hoje funciona pro Creator, Juris e Commerce (são os
// únicos sistemas com uma forma de criar conta pronta); os outros ainda
// dependem de você criar manualmente até termos uma API deles também.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.token) return NextResponse.json({ error: "Convite inválido." }, { status: 400 });

  const c = await getConvitePorToken(String(body.token));
  if (!c) return NextResponse.json({ error: "Convite não encontrado." }, { status: 404 });
  if (c.status === "pendente") return NextResponse.json({ error: "Aceite os termos de uso primeiro." }, { status: 400 });
  if (c.loginCriadoEm) return NextResponse.json({ error: "Este acesso já foi criado." }, { status: 400 });

  if (!SISTEMAS_AUTOMATICOS.includes(c.sistemaId)) {
    return NextResponse.json({ error: "Esse sistema ainda não tem criação automática de acesso — a Perspecta vai liberar seu login manualmente e te avisar." }, { status: 400 });
  }

  const { adminUsuario, adminNome, adminSenha, whatsapp } = body as Record<string, string>;
  if (!adminSenha) return NextResponse.json({ error: "Escolha uma senha." }, { status: 400 });
  if (!adminUsuario?.trim()) return NextResponse.json({ error: "Escolha um usuário." }, { status: 400 });

  if (c.sistemaId === "creator") {
    if (!creatorConfigured()) {
      return NextResponse.json({ error: "A criação automática de acesso ainda não está configurada (falta a chave do Creator). A Perspecta vai criar seu acesso manualmente em breve." }, { status: 400 });
    }
    const r = await criarEscritorioCreator({ nome: c.empresaNome, adminUsuario, adminNome, adminSenha, whatsapp });
    if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível criar o acesso." }, { status: 400 });
    await registrarLoginCriado(c.token, adminUsuario.trim());
  } else if (c.sistemaId === "juris") {
    if (!jurisConfigured()) {
      return NextResponse.json({ error: "A criação automática de acesso ainda não está configurada (falta a chave do Juris). A Perspecta vai criar seu acesso manualmente em breve." }, { status: 400 });
    }
    const r = await criarEscritorioJuris({ nome: c.empresaNome, adminLogin: adminUsuario, adminNome, adminSenha });
    if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível criar o acesso." }, { status: 400 });
    await registrarLoginCriado(c.token, adminUsuario.trim());
  } else {
    // Commerce: login é Empresa (nome do convite) + Nome + Senha — igual à
    // tela /login de lá, que não pede e-mail nenhum.
    if (!commerceConfigured()) {
      return NextResponse.json({ error: "A criação automática de acesso ainda não está configurada (falta a chave do Commerce). A Perspecta vai criar seu acesso manualmente em breve." }, { status: 400 });
    }
    const r = await criarLojaCommerce({ nomeLoja: c.empresaNome, adminUsuario, senha: adminSenha });
    if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível criar o acesso." }, { status: 400 });
    await registrarLoginCriado(c.token, adminUsuario.trim());
  }

  return NextResponse.json({ ok: true });
}
