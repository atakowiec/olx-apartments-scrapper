import {NextResponse} from "next/server";
import prisma from "@/util/prisma.ts";
import {requireAdmin} from "@/util/requireAdmin.ts";
import {hashPassword, publicUserSelect, validPassword, validUsername} from "@/util/users.ts";
import {adminConfig} from "@/util/session.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const users = await prisma.user.findMany({select: publicUserSelect, orderBy: {createdAt: "asc"}});
  return NextResponse.json(users, {headers: {"Cache-Control": "no-store"}});
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let body;
  try {body = await request.json();} catch {return NextResponse.json({error: "Nieprawidłowe dane."}, {status: 400});}
  if (!validUsername(body?.username) || !validPassword(body?.password) || (body.role !== undefined && body.role !== "user")) {
    return NextResponse.json({error: "Login: 3–50 znaków (litery, cyfry, kropka, myślnik lub _). Hasło: 12–256 znaków. Można tworzyć tylko konta użytkowników."}, {status: 400});
  }
  if (body.username === adminConfig()?.username) return NextResponse.json({error: "Ten login jest już zajęty."}, {status: 409});
  try {
    const user = await prisma.user.create({data: {username: body.username, passwordHash: await hashPassword(body.password), role: "user"}, select: publicUserSelect});
    return NextResponse.json(user, {status: 201, headers: {"Cache-Control": "no-store"}});
  } catch (error) {
    if ((error as {code?: string}).code === "P2002") return NextResponse.json({error: "Ten login jest już zajęty."}, {status: 409});
    throw error;
  }
}
