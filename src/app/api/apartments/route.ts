import {NextResponse} from "next/server";
import {handleImportUrl} from "@/services/apartmentsService.ts";
import loggerFactory from "@/util/winstonLogger.ts";
import prisma from "@/util/prisma.ts";

const logger = loggerFactory("APARTMENTS");

export async function DELETE() {
  await prisma.details.deleteMany()
  logger.info("Deleted all apartments")
  return NextResponse.json({status: "ok"})
}