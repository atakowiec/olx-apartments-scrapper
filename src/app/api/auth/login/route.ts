import {NextResponse} from "next/server";
import {adminConfig, createSession, SESSION_COOKIE, sessionCookieOptions} from "@/util/session.ts";
import {authenticate} from "@/util/users.ts";
import {sameOrigin} from "@/util/requireAdmin.ts";

// A bounded, server-wide limit for this single-process app.
const state = globalThis as typeof globalThis & {olxLoginAttempts?: {count: number; until: number}};

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({error: "Invalid request origin"}, {status: 403});
  if (!adminConfig()) return NextResponse.json({error: "Logowanie administratora nie jest skonfigurowane."}, {status: 503});
  const now = Date.now();
  if (!state.olxLoginAttempts || state.olxLoginAttempts.until <= now) state.olxLoginAttempts = {count: 0, until: now + 60_000};
  if (++state.olxLoginAttempts.count > 10) {
    return NextResponse.json({error: "Zbyt wiele prób. Spróbuj ponownie za minutę."}, {status: 429, headers: {"Retry-After": "60"}});
  }
  let body;
  try {body = await request.json();} catch {return NextResponse.json({error: "Nieprawidłowe dane logowania."}, {status: 400});}
  const user = await authenticate(body?.username, body?.password);
  if (!user) {
    return NextResponse.json({error: "Nieprawidłowy login lub hasło."}, {status: 401});
  }
  const response = NextResponse.json({ok: true}, {headers: {"Cache-Control": "no-store"}});
  response.cookies.set(SESSION_COOKIE, await createSession(user.id), sessionCookieOptions());
  return response;
}
