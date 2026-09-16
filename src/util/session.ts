export const SESSION_COOKIE = "olx_admin_session";
export const SESSION_SECONDS = 60 * 60 * 8;

export function adminConfig() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  return username && username.length <= 200 && password && password.length >= 12 && password.length <= 256 && secret && secret.length >= 32
    ? {username, password, secret} : null;
}

const bytes = (value: string) => new TextEncoder().encode(value);
const hex = (value: ArrayBuffer) => Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, "0")).join("");

export async function credentialsMatch(username: unknown, password: unknown): Promise<boolean> {
  const config = adminConfig();
  if (!config || typeof username !== "string" || typeof password !== "string") return false;
  const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", bytes(value)));
  const [actual, expected] = await Promise.all([
    digest(JSON.stringify([username, password])), digest(JSON.stringify([config.username, config.password]))
  ]);
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i];
  return difference === 0;
}

async function signingKey() {
  const config = adminConfig();
  if (!config) throw new Error("Admin authentication is not configured");
  // Changing credentials or the secret invalidates existing sessions.
  return crypto.subtle.importKey("raw", bytes(JSON.stringify(config)), {name: "HMAC", hash: "SHA-256"}, false, ["sign", "verify"]);
}

export async function createSession(userId: string, now = Date.now()): Promise<string> {
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(userId)) throw new Error("Invalid session subject");
  const payload = `${Math.floor(now / 1000) + SESSION_SECONDS}.${userId}.${crypto.randomUUID()}`;
  return `${payload}.${hex(await crypto.subtle.sign("HMAC", await signingKey(), bytes(payload)))}`;
}

export async function sessionSubject(token: string | undefined, now = Date.now()): Promise<string | null> {
  if (!adminConfig() || !token || token.length > 240) return null;
  const parts = token.split(".");
  if (parts.length !== 4 || !/^\d+$/.test(parts[0]) || !/^[a-zA-Z0-9_-]{1,64}$/.test(parts[1]) || !/^[a-f0-9-]{36}$/.test(parts[2]) || !/^[a-f0-9]{64}$/.test(parts[3])) return null;
  const expires = Number(parts[0]);
  const seconds = Math.floor(now / 1000);
  if (expires <= seconds || expires > seconds + SESSION_SECONDS) return null;
  const signature = Uint8Array.from(parts[3].match(/../g)!, byte => parseInt(byte, 16));
  const valid = await crypto.subtle.verify("HMAC", await signingKey(), signature, bytes(parts.slice(0, 3).join(".")));
  return valid ? parts[1] : null;
}

export async function verifySession(token: string | undefined, now = Date.now()): Promise<boolean> {
  return (await sessionSubject(token, now)) !== null;
}

export function sessionCookieOptions() {
  return {httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge: SESSION_SECONDS};
}
