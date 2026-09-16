import {NextResponse} from "next/server";
import loggerFactory from "@/util/winstonLogger.ts";
import prisma from "@/util/prisma.ts";
import {requireUser} from "@/util/requireAdmin.ts";
export const dynamic = "force-dynamic";

const logger = loggerFactory("apartments-random");

/**
 * returns random apartment
 */
export async function GET(request: Request) {
  const denied = await requireUser(request);
  if (denied) return denied;
  const source = new URL(request.url).searchParams.get("source") ?? "olx";
  if (source !== "olx" && source !== "otodom") {
    return NextResponse.json({error: "Invalid source"}, {status: 400});
  }
  const apartments = await prisma.details.findMany({
    where: {
      source,
      ...(source === "olx" ? {loaded: true} : {}),
      status: "pending"
    }
  })

  if (apartments.length === 0) {
    logger.warn("No apartments found")
    return NextResponse.json({error: "No apartments found"}, {status: 404})
  }

  const randomIndex = Math.floor(Math.random() * apartments.length)

  logger.info(`Returning random apartment - id ${apartments[randomIndex].id}`)

  return NextResponse.json(apartments[randomIndex], {headers: {"Cache-Control": "no-store"}})
}
