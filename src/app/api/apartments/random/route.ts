import {NextResponse} from "next/server";
import loggerFactory from "@/util/winstonLogger.ts";
import prisma from "@/util/prisma.ts";
import {DetailsType} from "@/services/apartmentsService.ts";

const logger = loggerFactory("apartments-random");

/**
 * returns random apartment
 */
export async function GET() {
  const apartments = await prisma.details.findMany({
    where: {
      loaded: true,
      status: "pending"
    }
  })

  if (apartments.length === 0) {
    // todo set status code, dont know how to do it yet
    logger.warn("No apartments found")
    return NextResponse.json({error: "No apartments found"})
  }

  const randomIndex = Math.floor(Math.random() * apartments.length)

  logger.info(`Returning random apartment - id ${apartments[randomIndex].id}`)

  return NextResponse.json(apartments[randomIndex])
}
