import type {ReactNode} from "react";
import {authenticatedPage} from "@/util/pageAuth.ts";

export default async function ImportLayout({children}: {children: ReactNode}) {
  await authenticatedPage(true);
  return <>{children}</>;
}
