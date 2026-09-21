import {NextResponse} from "next/server";
import {getImportJob, startImport} from "@/services/importJobs.ts";
import {parseImportUrl} from "@/util/importUrl.ts";
import {requireAdmin} from "@/util/requireAdmin.ts";
import {errorMessage} from "@/util/errorMessage.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    return NextResponse.json({job: await getImportJob()}, {headers: {"Cache-Control": "no-store"}});
  } catch (error) {
    return NextResponse.json({error: errorMessage(error)}, {status: 500, headers: {"Cache-Control": "no-store"}});
  }
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  let url: string;
  try {
    const body = await req.json();
    url = parseImportUrl(body?.url).toString();
  } catch (error) {
    return NextResponse.json({error: errorMessage(error)}, {status: 400});
  }

  try {
    const {started, job} = await startImport(url);
    return NextResponse.json({job}, {status: started ? 202 : 409});
  } catch (error) {
    return NextResponse.json({error: errorMessage(error)}, {status: 500});
  }
}
