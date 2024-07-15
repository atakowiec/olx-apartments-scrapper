import type {Metadata} from "next";
import {Inter} from "next/font/google";
import {ReactNode} from "react";
import "../style/globals.css"
import MainNavbar from "@/components/MainNavbar.tsx";

const inter = Inter({subsets: ["latin"]});

export const metadata: Metadata = {
  title: "OLX Apartments Scrapper",
  description: "Tool for scrapping apartments from OLX, saving them and displaying them in a nice way."
};

export default function RootLayout({children}: Readonly<{ children: ReactNode; }>) {
  return (
    <html lang="pl">
    <body className={`${inter.className} bg-gray-700 text-gray-50`}>
      <MainNavbar/>
      {children}
    </body>
    </html>
  );
}
