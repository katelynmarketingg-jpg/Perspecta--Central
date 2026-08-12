import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, authEnabled, authSecret } from "@/lib/auth";

// Protege todo o painel. Enquanto AUTH_EMAIL/AUTH_PASSWORD não estiverem
// configurados (na Vercel), o portão fica desligado — o site segue aberto.
export async function middleware(req: NextRequest) {
  if (!authEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  // rotas liberadas sempre
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/cadastro") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/api/logout") ||
    pathname.startsWith("/api/cadastro")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("pc_auth")?.value;
  const ok = await verifyToken(token, authSecret());
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // roda em tudo, menos assets internos do Next
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
