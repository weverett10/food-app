"use client";

import { useEffect } from "react";
import { flushQueue } from "@/lib/offlineSync";

export const SYNCED_EVENT = "food-tracker:synced";

async function runFlush() {
  const result = await flushQueue();
  if (result.processed > 0) {
    window.dispatchEvent(new CustomEvent(SYNCED_EVENT));
  }
}

export default function OfflineSyncManager() {
  useEffect(() => {
    runFlush();
    window.addEventListener("online", runFlush);
    return () => window.removeEventListener("online", runFlush);
  }, []);

  return null;
}
