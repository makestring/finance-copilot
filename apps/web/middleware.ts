import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Deve ser igual ao SESSION_COOKIE em lib/supabase.ts
const SESSION_COOKIE = "sb-session";

// Rotas acessíveis sem autenticação
const PUBLIC_PATHS = ["/login", "/landing", "/auth/confirm"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isPublic) {
    // Usuário já autenticado tentando acessar /login → redireciona para o dashboard
    if (pathname === "/login" && hasSession) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
