import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { criarEscritorioJuris } from "@/lib/integrations/juris";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Cria um escritório + usuário admin no Perspecta Juris, direto do Central.
// A senha vem no corpo só para ser repassada à API do Juris — nunca é gravada
// nem logada aqui.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { nome, adminLogin, adminSenha, adminNome, adminEmail } = body as Record<string, string>;
  const r = await criarEscritorioJuris({ nome, adminLogin, adminSenha, adminNome, adminEmail });
  if (!r.ok) return NextResponse.json({ error: r.erro || "Não foi possível criar." }, { status: 400 });
  revalidateTag("acessos-dados"); // novo acesso aparece na hora nas listas
  return NextResponse.json({ ok: true, id: r.id });
}
