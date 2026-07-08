import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Omnichannel Inbox | Premium",
  description: "Next-gen customer messaging platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="h-screen w-screen overflow-hidden flex bg-[#09090b]">
          {children}
        </div>
      </body>
    </html>
  );
}
