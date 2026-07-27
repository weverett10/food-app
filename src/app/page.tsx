"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { format } from "date-fns";
import imageCompression from "browser-image-compression";
import NavBar from "@/components/NavBar";
import LogEntryCard from "@/components/LogEntryCard";
import { todayLocalDateString, localTzOffsetMinutes } from "@/lib/dateHelpers";
import type { LogEntry } from "@/lib/types";

interface Totals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function TodayPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totals, setTotals] = useState<Totals>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadToday = useCallback(async () => {
    setLoading(true);
    const date = todayLocalDateString();
    const tzOffsetMinutes = localTzOffsetMinutes();
    try {
      const res = await fetch(
        `/api/logs/today?date=${date}&tzOffsetMinutes=${tzOffsetMinutes}`
      );
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs);
        setTotals(data.totals);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadToday();
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

      const formData = new FormData();
      formData.append("photo", compressed, selectedFile.name);
      if (note.trim()) formData.append("note", note.trim());

      const res = await fetch("/api/logs/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Couldn't analyze that photo, try again.");
        setAnalyzing(false);
        return;
      }

      setLogs((prev) => [data, ...prev]);
      setTotals((prev) => ({
        calories: prev.calories + data.totalCalories,
        protein: prev.protein + data.totalProtein,
        carbs: prev.carbs + data.totalCarbs,
        fat: prev.fat + data.totalFat,
      }));
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
        ) : logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">
            Nothing logged yet today.
          </p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <LogEntryCard key={log.logId} log={log} />
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

      <NavBar />
    </div>
  );
}
