"use client";

export default function PendingAnalyzeCard({
  previewDataUrl,
  note,
}: {
  previewDataUrl: string;
  note: string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="relative shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewDataUrl}
          alt="Pending meal"
          className="h-14 w-14 rounded-lg object-cover opacity-70"
        />
        <span
          title="Waiting to sync"
          className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] text-white shadow"
        >
          ⟳
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          Pending analysis
        </p>
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
          {note || "Will analyze when back online"}
        </p>
      </div>
    </div>
  );
}
