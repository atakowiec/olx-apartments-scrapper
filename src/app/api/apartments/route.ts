import {NextResponse} from "next/server";
import {requireAdmin, requireUser} from "@/util/requireAdmin.ts";
import loggerFactory from "@/util/winstonLogger.ts";
import prisma from "@/util/prisma.ts";
import {apartmentStatuses} from "@/types/apartment.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireUser(request);
  if (denied) return denied;
  const apartments = await prisma.details.findMany({
    where: {status: {in: [...apartmentStatuses]}},
    orderBy: {id: "desc"},
    include: {statusSetBy: {select: {id: true, username: true}}},
  });
  return NextResponse.json(apartments, {headers: {"Cache-Control": "no-store"}});
}

const logger = loggerFactory("APARTMENTS");

export async function DELETE(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  await prisma.details.deleteMany()
  logger.info("Deleted all apartments")
  return NextResponse.json({status: "ok"})
}
