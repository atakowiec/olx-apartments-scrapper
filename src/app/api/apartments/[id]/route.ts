import {NextResponse} from "next/server";
import prisma from "@/util/prisma.ts";
import {authorize} from "@/util/requireAdmin.ts";
import {isApartmentStatus} from "@/types/apartment.ts";

export async function PATCH(request: Request, props: {params: Promise<{id: string}>}) {
  const params = await props.params;
  const user = await authorize(request);
  if (user instanceof NextResponse) return user;
  const id = Number(params.id);
  if (!/^\d+$/.test(params.id) || !Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({error: "Invalid apartment ID"}, {status: 400});
  }
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({error: "Invalid JSON"}, {status: 400}); }
  if (!isApartmentStatus(body?.status)) {
    return NextResponse.json({error: "Invalid apartment status"}, {status: 400});
  }
  const result = await prisma.$transaction(async tx => {
    const apartment = await tx.details.findUnique({where: {id}, include: {statusSetBy: {select: {id: true, username: true}}}});
    if (!apartment) return null;
    // Retrying the same decision must not claim ownership or inflate activity counts.
    if (apartment.status === body.status) return apartment;
    const createdAt = new Date();
    const updated = await tx.details.update({where: {id},
      data: {status: body.status, statusSetById: user.id, statusSetAt: createdAt},
      include: {statusSetBy: {select: {id: true, username: true}}}});
    await tx.statusChange.create({data: {apartmentId: id, apartmentTitle: apartment.title,
      apartmentUrl: apartment.url, userId: user.id, fromStatus: apartment.status, toStatus: body.status, createdAt}});
    return updated;
  });
  if (!result) return NextResponse.json({error: "Apartment not found"}, {status: 404});
  return NextResponse.json({id, status: result.status, statusSetBy: result.statusSetBy, statusSetAt: result.statusSetAt}, {headers: {"Cache-Control": "no-store"}});
}
