import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import type {ReactNode} from "react";
import MainNavbar from "@/components/MainNavbar.tsx";
import {SESSION_COOKIE} from "@/util/session.ts";
import {userForSession} from "@/util/users.ts";

export const dynamic = "force-dynamic";

export default async function AdminLayout({children}: {children: ReactNode}) {
  const user = await userForSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login");
  return <><MainNavbar user={user}/>{children}</>;
}
