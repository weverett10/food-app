"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { format } from "date-fns";
import imageCompression from "browser-image-compression";
import NavBar from "@/components/NavBar";
import LogEntryCard from "@/components/LogEntryCard";
import PendingAnalyzeCard from "@/components/PendingAnalyzeCard";
import { todayLocalDateString, localTzOffsetMinutes } from "@/lib/dateHelpers";
import {
  enqueueAction,
  getQueuedActions,
  getTodayCache,
  setTodayCache,
  type QueuedAnalyze,
  type Totals,
} from "@/lib/offlineDb";
import { SYNCED_EVENT } from "@/components/OfflineSyncManager";
import type { LogEntry } from "@/lib/types";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function TodayPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totals, setTotals] = useState<Totals>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [loading, setLoading] = useState(true);
  const [pendingAnalyses, setPendingAnalyses] = useState<QueuedAnalyze[]>([]);
  const [pendingSyncLogIds, setPendingSyncLogIds] = useState<Set<string>>(new Set());
  const [showUpload, setShowUpload] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshQueueState = useCallback(async () => {
    const queue = await getQueuedActions();
    setPendingAnalyses(queue.filter((a): a is QueuedAnalyze => a.type === "analyze"));
    setPendingSyncLogIds(
      new Set(
        queue
          .filter((a) => a.type === "patch" || a.type === "delete")
          .map((a) => a.logId)
      )
    );
  }, []);

  const loadToday = useCallback(async () => {
    const date = todayLocalDateString();
    const tzOffsetMinutes = localTzOffsetMinutes();

    const cached = await getTodayCache(date).catch(() => undefined);
    if (cached) {
      setLogs(cached.logs);
      setTotals(cached.totals);
      setLoading(false);
    }

    await refreshQueueState();

    try {
      const res = await fetch(
        `/api/logs/today?date=${date}&tzOffsetMinutes=${tzOffsetMinutes}`
      );
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs);
        setTotals(data.totals);
        setTodayCache(date, data.logs, data.totals).catch(() => {});
      }
    } catch {
      // Offline or unreachable — keep showing cached data, if any.
    } finally {
      setLoading(false);
    }
  }, [refreshQueueState]);

  useEffect(() => {
    loadToday();
    function handleSynced() {
      loadToday();
    }
    window.addEventListener(SYNCED_EVENT, handleSynced);
    window.addEventListener("online", handleSynced);
    return () => {
      window.removeEventListener(SYNCED_EVENT, handleSynced);
      window.removeEventListener("online", handleSynced);
    };
  }, [loadToday]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowUpload(true);
    setError(null);
  }

  function closeUpload() {
    setShowUpload(false);
    setPreviewUrl(null);
    setSelectedFile(null);
    setNote("");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleAnalyze() {
    if (!selectedFile) return;
    setAnalyzing(true);
    setError(null);
    try {
      const compressed = await imageCompression(selectedFile, {
        maxWidthOrHeight: 1600,
        maxSizeMB: 3,
        useWebWorker: true,
      });

      const trimmedNote = note.trim() || null;

      let res: Response;
      try {
        const formData = new FormData();
        formData.append("photo", compressed, selectedFile.name);
        if (trimmedNote) formData.append("note", trimmedNote);
        res = await fetch("/api/logs/analyze", { method: "POST", body: formData });
      } catch {
        // Network unreachable — queue for later sync.
        const previewDataUrl = await blobToDataUrl(compressed);
        await enqueueAction({
          type: "analyze",
          tempId: crypto.randomUUID(),
          photoBlob: compressed,
          photoFileName: selectedFile.name,
          note: trimmedNote,
          previewDataUrl,
        });
        await refreshQueueState();
        setToast("Queued — will analyze when back online");
        setTimeout(() => setToast(null), 3000);
        closeUpload();
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Couldn't analyze that photo, try again.");
        setAnalyzing(false);
        return;
      }

      const nextLogs = [data, ...logs];
      const nextTotals = {
        calories: totals.calories + data.totalCalories,
        protein: totals.protein + data.totalProtein,
        carbs: totals.carbs + data.totalCarbs,
        fat: totals.fat + data.totalFat,
      };
      setLogs(nextLogs);
      setTotals(nextTotals);
      setTodayCache(todayLocalDateString(), nextLogs, nextTotals).catch(() => {});
      closeUpload();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 pb-20 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white px-4 py-5 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {format(new Date(), "EEEE, MMMM d")}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-4xl font-bold text-neutral-900 dark:text-neutral-100">
            {Math.round(totals.calories)}
          </span>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">calories today</span>
        </div>
        <div className="mt-2 flex gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <span>Protein {Math.round(totals.protein)}g</span>
          <span>Carbs {Math.round(totals.carbs)}g</span>
          <span>Fat {Math.round(totals.fat)}g</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Log a meal
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {loading ? (
          <p className="py-8 text-center text-sm text-neutral-400">Loading...</p>
        ) : logs.length === 0 && pendingAnalyses.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">
            Nothing logged yet today.
          </p>
        ) : (
          <div className="space-y-2">
            {pendingAnalyses.map((item) => (
              <PendingAnalyzeCard
                key={item.tempId}
                previewDataUrl={item.previewDataUrl}
                note={item.note}
              />
            ))}
            {logs.map((log) => (
              <LogEntryCard
                key={log.logId}
                log={log}
                pendingSync={pendingSyncLogIds.has(log.logId)}
              />
            ))}
          </div>
        )}
      </main>

      {showUpload && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-4 dark:bg-neutral-900 sm:rounded-2xl">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Selected meal"
                className="mb-3 h-56 w-full rounded-xl object-cover"
              />
            )}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder='Add a note (optional) — e.g. "grilled with olive oil"'
              className="mb-3 w-full resize-none rounded-lg border border-neutral-300 p-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              rows={2}
            />
            {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={closeUpload}
                disabled={analyzing}
                className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex-1 rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
              >
                {analyzing ? "Analyzing..." : "Analyze"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900">
          {toast}
        </div>
      )}

      <NavBar />
    </div>
  );
}
