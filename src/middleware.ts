import {NextRequest, NextResponse} from "next/server";
import {SESSION_COOKIE, verifySession} from "@/util/session.ts";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/login" || path === "/icon.svg" || path === "/api/auth/login" || path === "/api/auth/logout") return NextResponse.next();
  if (!await verifySession(request.cookies.get(SESSION_COOKIE)?.value)) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({error: "Authentication required"}, {status: 401, headers: {"Cache-Control": "no-store"}});
    }
    // Next's production middleware URL can contain localhost and its internal port.
    // Nginx overwrites Host and X-Forwarded-Proto with the browser-facing values.
    const internalUrl = new URL(request.url);
    const forwardedProtocol = request.headers.get("x-forwarded-proto");
    const protocol = forwardedProtocol === "https" || forwardedProtocol === "http"
      ? `${forwardedProtocol}:` : internalUrl.protocol;
    const host = request.headers.get("host") ?? internalUrl.host;
    const response = NextResponse.redirect(new URL("/login", `${protocol}//${host}`));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]};
