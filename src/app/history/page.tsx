"use client";

import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import NavBar from "@/components/NavBar";
import LogEntryCard from "@/components/LogEntryCard";
import { localTzOffsetMinutes } from "@/lib/dateHelpers";
import type { LogEntry } from "@/lib/types";

interface DayGroup {
  date: string;
  logs: LogEntry[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
}

export default function HistoryPage() {
  const [days, setDays] = useState<DayGroup[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    const tzOffsetMinutes = localTzOffsetMinutes();
    const res = await fetch(`/api/logs/history?tzOffsetMinutes=${tzOffsetMinutes}`);
    const data = await res.json();
    if (res.ok) {
      setDays(data.days);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    const tzOffsetMinutes = localTzOffsetMinutes();
    const res = await fetch(
      `/api/logs/history?cursor=${cursor}&tzOffsetMinutes=${tzOffsetMinutes}`
    );
    const data = await res.json();
    if (res.ok) {
      setDays((prev) => [...prev, ...data.days]);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    }
    setLoadingMore(false);
  }

  function toggleDay(date: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 pb-20 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white px-4 py-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          History
        </h1>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-neutral-400">Loading...</p>
        ) : days.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">No history yet.</p>
        ) : (
          <div className="space-y-3">
            {days.map((day) => {
              const isOpen = expanded.has(day.date);
              return (
                <div
                  key={day.date}
                  className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <button
                    onClick={() => toggleDay(day.date)}
                    className="flex w-full items-center justify-between p-3"
                  >
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {format(parseISO(day.date), "EEEE, MMM d")}
                    </span>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                      {Math.round(day.totals.calories)} cal
                    </span>
                  </button>
                  {isOpen && (
                    <div className="space-y-2 border-t border-neutral-100 p-3 dark:border-neutral-800">
                      {day.logs.map((log) => (
                        <LogEntryCard key={log.logId} log={log} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full rounded-lg border border-neutral-300 py-2.5 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            )}
          </div>
        )}
      </main>

      <NavBar />
    </div>
  );
}
