import { NextResponse } from "next/server";
import { makeToken, authSecret } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const email = (process.env.AUTH_EMAIL || "").trim().toLowerCase();
  const pass = process.env.AUTH_PASSWORD || "";
  if (!email || !pass) {
    return NextResponse.json(
      { error: "Login ainda não configurado. Defina AUTH_EMAIL e AUTH_PASSWORD nas variáveis de ambiente da Vercel." },
      { status: 501 }
    );
  }

  const form = await req.formData();
  const e = String(form.get("email") || "").trim().toLowerCase();
  const p = String(form.get("password") || "");

  if (e !== email || p !== pass) {
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }

  const token = await makeToken(email, authSecret());
  const res = NextResponse.json({ ok: true });
  res.cookies.set("pc_auth", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
