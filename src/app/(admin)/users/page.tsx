import {authenticatedPage} from "@/util/pageAuth.ts";
import prisma from "@/util/prisma.ts";
import {publicUserSelect} from "@/util/users.ts";
import UserAccounts from "@/components/UserAccounts.tsx";

export default async function UsersPage() {
  await authenticatedPage(true);
  const users = await prisma.user.findMany({select: publicUserSelect, orderBy: {createdAt: "asc"}});
  return <UserAccounts initialUsers={users.map(user => ({...user, createdAt: user.createdAt.toISOString()}))}/>;
}
