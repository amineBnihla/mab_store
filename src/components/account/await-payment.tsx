"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const INTERVAL_MS = 2000;
const MAX_TRIES = 15;

/**
 * Re-renders the order page while its payment webhook is in flight, so a
 * customer who beats the webhook sees the confirmation without reloading.
 * Mounted only while the order is `pending`; gives up after ~30s and says so.
 */
export function AwaitPayment() {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let tries = 0;
    const id = setInterval(() => {
      if (++tries > MAX_TRIES) {
        clearInterval(id);
        setGaveUp(true);
      } else router.refresh();
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  if (!gaveUp) return null;
  return (
    <p role="status" className="text-2xs text-muted-foreground">
      This is taking longer than usual. You won&apos;t be charged twice — check back in a few minutes or{" "}
      <button type="button" onClick={() => router.refresh()} className="link">
        refresh now
      </button>
      .
    </p>
  );
}
