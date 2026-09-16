import {randomBytes, scrypt, timingSafeEqual} from "node:crypto";
import {promisify} from "node:util";
import prisma from "@/util/prisma.ts";
import {adminConfig, credentialsMatch, sessionSubject} from "@/util/session.ts";

const derive = promisify(scrypt);
export const publicUserSelect = {id: true, username: true, role: true, createdAt: true} as const;
export type AuthUser = {id: string; username: string; role: string};

export function validUsername(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_.-]{3,50}$/.test(value);
}

export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && value.length <= 256;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${key.toString("hex")}`;
}

export async function passwordMatches(password: string, hash: string | null) {
  // Use the same expensive operation for unknown accounts to avoid an easy timing oracle.
  const [, salt, expected] = (hash ?? `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`).split(":");
  if (!salt || !expected || !/^[a-f0-9]{128}$/.test(expected)) return false;
  const actual = await derive(password, salt, 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(expected, "hex")) && hash !== null;
}

export async function authenticate(username: unknown, password: unknown): Promise<AuthUser | null> {
  const config = adminConfig();
  if (!config || typeof username !== "string" || username.length > 200 || typeof password !== "string" || password.length > 256) return null;
  if (await credentialsMatch(username, password)) {
    // The stable ID keeps the administrator's history attached when .env credentials change.
    return prisma.user.upsert({where: {id: "admin"},
      create: {id: "admin", username: config.username, role: "admin"},
      update: {username: config.username, role: "admin", passwordHash: null}, select: publicUserSelect});
  }
  const user = await prisma.user.findUnique({where: {username}});
  const valid = await passwordMatches(password, user?.id === "admin" ? null : user?.passwordHash ?? null);
  return valid && user && user.role === "user" ? {id: user.id, username: user.username, role: user.role} : null;
}

export async function userForSession(token: string | undefined): Promise<AuthUser | null> {
  const id = await sessionSubject(token);
  if (!id) return null;
  const user = await prisma.user.findUnique({where: {id}, select: publicUserSelect});
  return user && (user.role === "admin" || user.role === "user") ? user : null;
}
