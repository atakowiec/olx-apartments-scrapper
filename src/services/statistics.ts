import prisma from "@/util/prisma.ts";
import {isApartmentStatus} from "@/types/apartment.ts";

export const HISTORY_PAGE_SIZE = 50;

export async function getStatistics(requestedPage = 1) {
  // A single snapshot keeps chart totals, table totals and pagination consistent.
  return prisma.$transaction(async tx => {
    const users = await tx.user.findMany({select: {id: true, username: true}, orderBy: {username: "asc"}});
    const counts = await tx.statusChange.groupBy({by: ["userId", "toStatus"], _count: {_all: true}});
    const total = counts.reduce((sum, group) => sum + group._count._all, 0);
    const pages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
    const page = Number.isSafeInteger(requestedPage) ? Math.max(1, Math.min(pages, requestedPage)) : 1;
    const summary = users.map(user => {
      const row = {...user, accepted: 0, maybe: 0, rejected: 0, total: 0};
      for (const group of counts) {
        if (group.userId === user.id && isApartmentStatus(group.toStatus)) {
          row[group.toStatus] = group._count._all;
          row.total += group._count._all;
        }
      }
      return row;
    });
    const history = await tx.statusChange.findMany({include: {user: {select: {username: true}}},
      orderBy: [{createdAt: "desc"}, {id: "desc"}], skip: (page - 1) * HISTORY_PAGE_SIZE, take: HISTORY_PAGE_SIZE});
    const unattributed = await tx.details.count({where: {status: {not: "pending"}, statusSetById: null}});
    return {summary, total, history, page, pages, unattributed};
  });
}
