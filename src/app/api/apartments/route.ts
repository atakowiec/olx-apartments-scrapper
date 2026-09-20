import {NextResponse} from "next/server";
import {requireAdmin, requireUser} from "@/util/requireAdmin.ts";
import loggerFactory from "@/util/winstonLogger.ts";
import prisma from "@/util/prisma.ts";
import {apartmentStatuses, isApartmentStatus} from "@/types/apartment.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireUser(request);
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const status = params.get("status") ?? "all";
  const source = params.get("source") ?? "all";
  if ((status !== "all" && !isApartmentStatus(status)) || !["all", "olx", "otodom"].includes(source)) {
    return NextResponse.json({error: "Invalid filter"}, {status: 400});
  }
  const sourceFilter = source === "all" ? {} : {source};
  const apartments = await prisma.details.findMany({
    where: {...sourceFilter, status: status === "all" ? {in: [...apartmentStatuses]} : status},
    orderBy: [{viewingScheduled: "desc"}, {messageSent: "desc"}, {id: "desc"}],
    include: {statusSetBy: {select: {id: true, username: true}}},
  });
  if (params.has("status")) {
    const groups = await prisma.details.groupBy({by: ["status"],
      where: {...sourceFilter, status: {in: [...apartmentStatuses]}}, _count: {_all: true}});
    const counts = {all: 0, accepted: 0, maybe: 0, rejected: 0};
    for (const group of groups) {
      if (isApartmentStatus(group.status)) counts[group.status] = group._count._all;
      counts.all += group._count._all;
    }
    return NextResponse.json({apartments, counts}, {headers: {"Cache-Control": "no-store"}});
  }
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
