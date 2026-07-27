"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { FoodItem, LogEntry } from "@/lib/types";

type EditMode = "items" | "totals";

export default function EditLogPage({
  params,
}: {
  params: Promise<{ logId: string }>;
}) {
  const { logId } = usePromise(params);
  const router = useRouter();

  const [log, setLog] = useState<LogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<EditMode>("items");
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/logs/${logId}`);
      const data = await res.json();
      if (res.ok) {
        setLog(data);
        setFoods(data.foods);
        setTotals({
          calories: data.totalCalories,
          protein: data.totalProtein,
          carbs: data.totalCarbs,
          fat: data.totalFat,
        });
      } else {
        setError(data.error || "Could not load this entry");
      }
      setLoading(false);
    }
    load();
  }, [logId]);

  const itemTotals = foods.reduce(
    (acc, f) => ({
      calories: acc.calories + (Number(f.calories) || 0),
      protein: acc.protein + (Number(f.protein) || 0),
      carbs: acc.carbs + (Number(f.carbs) || 0),
      fat: acc.fat + (Number(f.fat) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  function updateFood(index: number, field: keyof FoodItem, value: string) {
    setFoods((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f;
        if (field === "name" || field === "quantity") {
          return { ...f, [field]: value };
        }
        return { ...f, [field]: Number(value) || 0 };
      })
    );
  }

  function removeFood(index: number) {
    setFoods((prev) => prev.filter((_, i) => i !== index));
  }

  function addFood() {
    setFoods((prev) => [
      ...prev,
      { name: "", quantity: "", calories: 0, protein: 0, carbs: 0, fat: 0 },
    ]);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const body =
        mode === "items"
          ? { foods }
          : {
              totalCalories: totals.calories,
              totalProtein: totals.protein,
              totalCarbs: totals.carbs,
              totalFat: totals.fat,
            };
      const res = await fetch(`/api/logs/${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save changes");
        setSaving(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setSaving(false);
    }
  }

  async function handleSaveAsFavorite() {
    const name = prompt("Name this favorite (e.g. \"Chicken & Rice Bowl\")");
    if (!name || !name.trim()) return;
    setError(null);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save favorite");
        return;
      }
      alert(`Saved "${name.trim()}" to favorites`);
    } catch {
      setError("Something went wrong. Try again.");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/logs/${logId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setDeleting(false);
        setError("Could not delete this entry");
      }
    } catch {
      setDeleting(false);
      setError("Something went wrong. Try again.");
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-sm text-neutral-400">Loading...</div>;
  }

  if (!log) {
    return (
      <div className="p-6 text-center text-sm text-red-600 dark:text-red-400">
        {error || "Entry not found"}
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-neutral-50 pb-24 dark:bg-neutral-950">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <button
          onClick={() => router.push("/")}
          className="text-sm text-neutral-500 dark:text-neutral-400"
        >
          Cancel
        </button>
        <h1 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Edit Entry
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm font-semibold text-neutral-900 disabled:opacity-50 dark:text-neutral-100"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </header>

      <div className="px-4 py-4">
        {log.photoThumbnailUrl && (
          <Image
            src={log.photoThumbnailUrl}
            alt="Meal"
            width={400}
            height={200}
            unoptimized
            className="mb-4 h-40 w-full rounded-xl object-cover"
          />
        )}
        {log.assumptions && (
          <p className="mb-4 text-xs italic text-neutral-500 dark:text-neutral-400">
            {log.assumptions}
          </p>
        )}

        <div className="mb-4 flex rounded-lg border border-neutral-300 p-1 text-sm dark:border-neutral-700">
          <button
            onClick={() => setMode("items")}
            className={`flex-1 rounded-md py-1.5 font-medium ${
              mode === "items"
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "text-neutral-500"
            }`}
          >
            Edit items
          </button>
          <button
            onClick={() => setMode("totals")}
            className={`flex-1 rounded-md py-1.5 font-medium ${
              mode === "totals"
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "text-neutral-500"
            }`}
          >
            Edit totals
          </button>
        </div>

        {mode === "items" ? (
          <div className="space-y-3">
            {foods.map((food, i) => (
              <div
                key={i}
                className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="mb-2 flex gap-2">
                  <input
                    value={food.name}
                    onChange={(e) => updateFood(i, "name", e.target.value)}
                    placeholder="Name"
                    className="min-w-0 flex-1 rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                  />
                  <input
                    value={food.quantity}
                    onChange={(e) => updateFood(i, "quantity", e.target.value)}
                    placeholder="Qty"
                    className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                  />
                  <button
                    onClick={() => removeFood(i)}
                    className="px-1 text-red-500"
                    aria-label="Remove item"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {(["calories", "protein", "carbs", "fat"] as const).map((field) => (
                    <label key={field} className="flex flex-col gap-1">
                      <span className="capitalize text-neutral-400">{field}</span>
                      <input
                        type="number"
                        value={food[field]}
                        onChange={(e) => updateFood(i, field, e.target.value)}
                        className="rounded border border-neutral-300 px-1.5 py-1 dark:border-neutral-700 dark:bg-neutral-800"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={addFood}
              className="w-full rounded-lg border border-dashed border-neutral-300 py-2 text-sm text-neutral-500 dark:border-neutral-700"
            >
              + Add item
            </button>
            <div className="rounded-xl bg-neutral-100 p-3 text-sm dark:bg-neutral-800">
              <p className="font-medium text-neutral-900 dark:text-neutral-100">
                Total: {Math.round(itemTotals.calories)} cal
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                P{Math.round(itemTotals.protein)} · C{Math.round(itemTotals.carbs)} · F
                {Math.round(itemTotals.fat)}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {(["calories", "protein", "carbs", "fat"] as const).map((field) => (
              <label key={field} className="flex flex-col gap-1 text-sm">
                <span className="capitalize text-neutral-500 dark:text-neutral-400">
                  {field}
                </span>
                <input
                  type="number"
                  value={totals[field]}
                  onChange={(e) =>
                    setTotals((prev) => ({ ...prev, [field]: Number(e.target.value) || 0 }))
                  }
                  className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
                />
              </label>
            ))}
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          onClick={handleSaveAsFavorite}
          className="mt-6 w-full rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
        >
          Save as favorite
        </button>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="mt-3 w-full rounded-lg border border-red-300 py-2.5 text-sm font-medium text-red-600 disabled:opacity-50 dark:border-red-900 dark:text-red-400"
        >
          {deleting ? "Deleting..." : "Delete entry"}
        </button>
      </div>
    </div>
  );
}
