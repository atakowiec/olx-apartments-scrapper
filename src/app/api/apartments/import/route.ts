import {NextResponse} from "next/server";
import {handleImportUrl} from "@/services/apartmentsService.ts";
import loggerFactory from "@/util/winstonLogger.ts";
import prisma from "@/util/prisma.ts";

const logger = loggerFactory("IMPORT");

export async function POST(req: Request) {
  const {url} = await req.json();

  // yeah, I want to do it async
  handleImportUrl(url)
    .then(() => logger.info(`Imported data from ${url}`))

  return NextResponse.json({status: "ok"})
}