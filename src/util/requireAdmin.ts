import {NextRequest, NextResponse} from "next/server";
import {SESSION_COOKIE} from "@/util/session.ts";
import {userForSession, type AuthUser} from "@/util/users.ts";

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const supplied = new URL(origin);
    const target = new URL(request.url);
    // Next's Node adapter can use its internal hostname in request.url.
    // Host still identifies the public host addressed by the browser.
    const host = request.headers.get("host") ?? target.host;
    const forwardedProtocol = request.headers.get("x-forwarded-proto");
    const protocol = forwardedProtocol === "https" || forwardedProtocol === "http"
      ? `${forwardedProtocol}:` : target.protocol;
    return supplied.origin === origin && supplied.host === host && supplied.protocol === protocol;
  } catch {return false;}
}

export async function requireAdmin(request: Request): Promise<NextResponse | null> {
  const result = await authorize(request, true);
  return result instanceof NextResponse ? result : null;
}

export async function requireUser(request: Request): Promise<NextResponse | null> {
  const result = await authorize(request);
  return result instanceof NextResponse ? result : null;
}

export async function authorize(request: Request, adminOnly = false): Promise<AuthUser | NextResponse> {
  // Only inspect headers: constructing a Request from the original transfers its body.
  const token = new NextRequest(request.url, {headers: request.headers}).cookies.get(SESSION_COOKIE)?.value;
  const user = await userForSession(token);
  if (!user) {
    return NextResponse.json({error: "Authentication required"}, {status: 401, headers: {"Cache-Control": "no-store"}});
  }
  if (adminOnly && user.role !== "admin") return NextResponse.json({error: "Administrator access required"}, {status: 403});
  if (!["GET", "HEAD"].includes(request.method) && !sameOrigin(request)) {
    return NextResponse.json({error: "Invalid request origin"}, {status: 403});
  }
  return user;
}
