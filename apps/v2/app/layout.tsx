import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { SimpleAnalyticsTracker } from "@/components/simple-analytics-tracker";
import { env } from "@/lib/env";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_APP_TITLE ?? "Grabbin"} — A Link in Bio`,
  description: "A cleaner, more beautiful link in bio.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex flex-col">
        <Script
          src="https://scripts.simpleanalyticscdn.com/latest.js"
          strategy="afterInteractive"
          data-auto-collect="false"
        />
        <Providers>
          <SimpleAnalyticsTracker />
          <main className="flex min-h-svh flex-col">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
