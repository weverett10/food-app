import { getQueuedActions, removeQueuedAction, type QueuedAction } from "./offlineDb";

export function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

async function processAction(action: QueuedAction): Promise<void> {
  if (action.type === "analyze") {
    const formData = new FormData();
    formData.append("photo", action.photoBlob, action.photoFileName);
    if (action.note) formData.append("note", action.note);
    const res = await fetch("/api/logs/analyze", { method: "POST", body: formData });
    if (!res.ok) throw new Error("analyze failed");
  } else if (action.type === "patch") {
    const res = await fetch(`/api/logs/${action.logId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action.body),
    });
    if (!res.ok) throw new Error("patch failed");
  } else if (action.type === "delete") {
    const res = await fetch(`/api/logs/${action.logId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("delete failed");
  }
}

export async function flushQueue(): Promise<{ processed: number; failed: number }> {
  if (!isOnline()) return { processed: 0, failed: 0 };

  const actions = await getQueuedActions();
  let processed = 0;
  let failed = 0;

  for (const action of actions) {
    try {
      await processAction(action);
      await removeQueuedAction(action.id);
      processed++;
    } catch {
      // Stop on first failure to preserve ordering; the remaining queue
      // will be retried on the next online event or app load.
      failed++;
      break;
    }
  }

  return { processed, failed };
}
