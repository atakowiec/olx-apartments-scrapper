import {NextResponse} from "next/server";
import {sameOrigin} from "@/util/requireAdmin.ts";
import {SESSION_COOKIE, sessionCookieOptions} from "@/util/session.ts";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({error: "Invalid request origin"}, {status: 403});
  const response = NextResponse.redirect(new URL("/login", request.headers.get("origin")!), 303);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(SESSION_COOKIE, "", {...sessionCookieOptions(), maxAge: 0});
  return response;
}
