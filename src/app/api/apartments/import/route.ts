import {NextResponse} from "next/server";
import {getImportJob, startImport} from "@/services/importJobs.ts";
import {parseImportUrl} from "@/util/importUrl.ts";
import {requireAdmin} from "@/util/requireAdmin.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return NextResponse.json({job: getImportJob()}, {headers: {"Cache-Control": "no-store"}});
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  let url: string;
  try {
    const body = await req.json();
    url = parseImportUrl(body?.url).toString();
  } catch {
    return NextResponse.json({error: "Provide a valid HTTPS OLX apartment search URL"}, {status: 400});
  }

  const {started, job} = startImport(url);
  return NextResponse.json({job}, {status: started ? 202 : 409});
}
