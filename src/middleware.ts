import {NextRequest, NextResponse} from "next/server";
import {SESSION_COOKIE, verifySession} from "@/util/session.ts";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/login" || path === "/icon.svg" || path === "/api/auth/login" || path === "/api/auth/logout") return NextResponse.next();
  if (!await verifySession(request.cookies.get(SESSION_COOKIE)?.value)) {
    return path.startsWith("/api/")
      ? NextResponse.json({error: "Authentication required"}, {status: 401, headers: {"Cache-Control": "no-store"}})
      : NextResponse.redirect(new URL("/login", request.url));
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]};
