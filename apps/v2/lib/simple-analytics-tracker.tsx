"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    sa_pageview?: (path?: string) => void;
  }
}

const isProductionHost = () =>
  typeof window !== "undefined" && window.location.hostname === "grabbin.me";

export function SimpleAnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isProductionHost()) return;

    if (window.sa_pageview) {
      window.sa_pageview(pathname);
      return;
    }

    const retryOnLoad = () => window.sa_pageview?.(pathname);
    window.addEventListener("load", retryOnLoad, { once: true });
    return () => window.removeEventListener("load", retryOnLoad);
  }, [pathname]);

  return null;
}
