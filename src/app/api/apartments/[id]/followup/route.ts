import {NextResponse} from "next/server";
import prisma from "@/util/prisma.ts";
import {requireUser} from "@/util/requireAdmin.ts";
import type {ApartmentFollowup} from "@/types/apartment.ts";

export async function PATCH(request: Request, props: {params: Promise<{id: string}>}) {
  const denied = await requireUser(request);
  if (denied) return denied;
  const {id: rawId} = await props.params;
  const id = Number(rawId);
  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({error: "Invalid apartment ID"}, {status: 400});
  }
  let body;
  try {body = await request.json();}
  catch {return NextResponse.json({error: "Invalid JSON"}, {status: 400});}
  if (!body || typeof body !== "object" || Array.isArray(body) || !Object.keys(body).length ||
      Object.keys(body).some(key => !["messageSent", "viewingScheduled", "notes"].includes(key)) ||
      ("messageSent" in body && typeof body.messageSent !== "boolean") ||
      ("viewingScheduled" in body && typeof body.viewingScheduled !== "boolean") ||
      ("notes" in body && (typeof body.notes !== "string" || body.notes.length > 5000))) {
    return NextResponse.json({error: "Invalid flags or note (maximum 5000 characters)"}, {status: 400});
  }
  const data: Partial<ApartmentFollowup> = {};
  if ("messageSent" in body) data.messageSent = body.messageSent;
  if ("viewingScheduled" in body) data.viewingScheduled = body.viewingScheduled;
  if ("notes" in body) data.notes = body.notes;
  // Patch only submitted fields; changing a flag must not overwrite someone else's note.
  const result = await prisma.details.updateMany({where: {id}, data});
  if (!result.count) return NextResponse.json({error: "Apartment not found"}, {status: 404});
  return NextResponse.json({id, ...data}, {headers: {"Cache-Control": "no-store"}});
}
