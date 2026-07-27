"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { LogEntry } from "@/lib/types";

export default function LogEntryCard({
  log,
  pendingSync = false,
}: {
  log: LogEntry;
  pendingSync?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const foodSummary = log.foods.map((f) => f.name).join(", ") || "Untitled meal";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-3">
        <Link href={`/logs/${log.logId}/edit`} className="relative shrink-0">
          {log.photoThumbnailUrl ? (
            <Image
              src={log.photoThumbnailUrl}
              alt={foodSummary}
              width={56}
              height={56}
              className="h-14 w-14 rounded-lg object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-neutral-100 text-xs text-neutral-400 dark:bg-neutral-800">
              No photo
            </div>
          )}
          {pendingSync && (
            <span
              title="Not yet synced"
              className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] text-white shadow"
            >
              ⟳
            </span>
          )}
        </Link>
        <Link href={`/logs/${log.logId}/edit`} className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {foodSummary}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {Math.round(log.totalCalories)} cal
          </p>
        </Link>
        {log.foods.length > 0 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="shrink-0 rounded-full p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label={expanded ? "Hide details" : "Show details"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          {log.foods.map((food, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-neutral-700 dark:text-neutral-300">
                {food.name} <span className="text-neutral-400">({food.quantity})</span>
              </span>
              <span className="text-neutral-500 dark:text-neutral-400">
                {Math.round(food.calories)} cal · P{Math.round(food.protein)} C
                {Math.round(food.carbs)} F{Math.round(food.fat)}
              </span>
            </div>
          ))}
          {log.assumptions && (
            <p className="pt-1 text-xs italic text-neutral-400">{log.assumptions}</p>
          )}
        </div>
      )}
    </div>
  );
}
