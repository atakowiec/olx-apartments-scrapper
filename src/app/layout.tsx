import type {Metadata} from "next";
import {Inter} from "next/font/google";
import {ReactNode} from "react";
import "../style/globals.css"

const inter = Inter({subsets: ["latin"]});

export const metadata: Metadata = {
  title: "Wyszukiwarka mieszkań",
  applicationName: "Wyszukiwarka mieszkań",
  description: "Wyszukuj, porównuj i wybieraj mieszkania z OLX. Twoje następne miejsce zaczyna się tutaj."
};

export default function RootLayout({children}: Readonly<{ children: ReactNode; }>) {
  return (
    <html lang="pl">
    <body className={`${inter.className} bg-gray-700 text-gray-50`}>
      {children}
    </body>
    </html>
  );
}
