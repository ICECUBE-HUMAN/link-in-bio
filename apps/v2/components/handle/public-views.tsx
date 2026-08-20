"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type PublicViewsProps = { pageId: string };
type PublicViewsResponse = {
  todayViews: number | null;
  yesterdayViews: number | null;
};

export function PublicViews({ pageId }: PublicViewsProps) {
  const [views, setViews] = useState<PublicViewsResponse | null>(null);
  const requestedPageId = useRef<string | null>(null);

  useEffect(() => {
    if (requestedPageId.current === pageId) return;
    requestedPageId.current = pageId;
    let cancelled = false;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const params = new URLSearchParams({ pageId, timezone });

    fetch(`/api/public-views?${params}`, { credentials: "include" })
      .then((response) =>
        response.ok ? (response.json() as Promise<PublicViewsResponse>) : null,
      )
      .then((value: PublicViewsResponse | null) => {
        if (!cancelled) setViews(value);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [pageId]);

  if (!views || views.todayViews === null || views.yesterdayViews === null) {
    return <span className="h-8 w-24" aria-hidden="true" />;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="rounded-md text-sm text-muted-foreground/80"
      title={`${views.yesterdayViews} views yesterday`}
    >
      {views.todayViews} <span className="ml-1">views today</span>
    </Button>
  );
}
