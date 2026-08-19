import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { SimpleAnalyticsTracker } from "@/components/simple-analytics-tracker";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_APP_TITLE ?? "grabbin"} — A Link in Bio`,
  description:
    "Create a beautiful link in bio page with your links, media, and favorite places.",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
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
