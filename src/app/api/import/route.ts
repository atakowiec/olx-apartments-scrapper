import {NextResponse} from "next/server";
import {handleImportUrl} from "@/app/api/import/service.ts";
import loggerFactory from "@/logger/winstonLogger.ts";

const logger = loggerFactory("IMPORT");

export async function POST(req: Request) {
  const {url} = await req.json();

  handleImportUrl(url)
    .then(() => logger.info(`Imported data from ${url}`))

  return NextResponse.json({status: "ok"})
}