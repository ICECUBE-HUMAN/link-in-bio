"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function PrimaryPageAction({ handle }: { handle: string }) {
  const [state, setState] = useState<"idle" | "setting" | "success" | "hidden">(
    "idle",
  );
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  async function setPrimary() {
    if (state !== "idle") return;
    setState("setting");
    const response = await fetch(
      `/api/pages/${encodeURIComponent(handle)}/primary`,
      { method: "PATCH", credentials: "include" },
    ).catch(() => null);
    if (!response?.ok) {
      setState("idle");
      return;
    }

    setState("success");
    timer.current = window.setTimeout(() => {
      setState("hidden");
    }, 2300);
  }

  if (state === "hidden") return null;

  return (
    <div className="mt-20 w-fit">
      <Button
        type="button"
        variant="secondary"
        className="t-copy-button w-fit rounded-lg text-muted-foreground"
        disabled={state === "setting"}
        aria-busy={state === "setting"}
        onClick={() => void setPrimary()}
      >
        <span aria-live="polite">
          {state === "success"
            ? "Now it's your primary page!"
            : "set as primary page"}
        </span>
      </Button>
    </div>
  );
}
