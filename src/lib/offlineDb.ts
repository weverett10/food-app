import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { LogEntry } from "./types";

export interface Totals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface QueuedAnalyze {
  id: number;
  type: "analyze";
  createdAt: number;
  tempId: string;
  photoBlob: Blob;
  photoFileName: string;
  note: string | null;
  previewDataUrl: string;
}

export interface QueuedPatch {
  id: number;
  type: "patch";
  createdAt: number;
  logId: string;
  body: Record<string, unknown>;
}

export interface QueuedDelete {
  id: number;
  type: "delete";
  createdAt: number;
  logId: string;
}

export type QueuedAction = QueuedAnalyze | QueuedPatch | QueuedDelete;

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

interface FoodTrackerDB extends DBSchema {
  queue: {
    key: number;
    value: QueuedAction;
  };
  todayCache: {
    key: string;
    value: { date: string; logs: LogEntry[]; totals: Totals };
  };
}

let dbPromise: Promise<IDBPDatabase<FoodTrackerDB>> | null = null;

function getDb() {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment");
  }
  if (!dbPromise) {
    dbPromise = openDB<FoodTrackerDB>("food-tracker-offline", 1, {
      upgrade(db) {
        db.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
        db.createObjectStore("todayCache", { keyPath: "date" });
      },
    });
  }
  return dbPromise;
}

export async function enqueueAction(
  action: DistributiveOmit<QueuedAction, "id" | "createdAt">
): Promise<number> {
  const db = await getDb();
  return db.add("queue", { ...action, createdAt: Date.now() } as QueuedAction);
}

export async function getQueuedActions(): Promise<QueuedAction[]> {
  const db = await getDb();
  const all = await db.getAll("queue");
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeQueuedAction(id: number): Promise<void> {
  const db = await getDb();
  await db.delete("queue", id);
}

export async function getTodayCache(
  date: string
): Promise<{ logs: LogEntry[]; totals: Totals } | undefined> {
  const db = await getDb();
  const entry = await db.get("todayCache", date);
  return entry ? { logs: entry.logs, totals: entry.totals } : undefined;
}

export async function setTodayCache(
  date: string,
  logs: LogEntry[],
  totals: Totals
): Promise<void> {
  const db = await getDb();
  await db.put("todayCache", { date, logs, totals });
}
