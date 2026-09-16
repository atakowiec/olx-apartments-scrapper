import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {SESSION_COOKIE} from "@/util/session.ts";
import {userForSession} from "@/util/users.ts";

export async function authenticatedPage(adminOnly = false) {
  const user = await userForSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login");
  if (adminOnly && user.role !== "admin") redirect("/");
  return user;
}
