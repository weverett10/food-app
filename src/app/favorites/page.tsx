"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import type { Favorite } from "@/lib/types";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [usingId, setUsingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/favorites");
    const data = await res.json();
    if (res.ok) setFavorites(data.favorites);
    setLoading(false);
  }

  async function handleUse(fav: Favorite) {
    setUsingId(fav.favoriteId);
    try {
      const res = await fetch(`/api/favorites/${fav.favoriteId}/use`, { method: "POST" });
      if (res.ok) {
        setToast(`Logged: ${fav.name}`);
        setTimeout(() => setToast(null), 2500);
        load();
      }
    } finally {
      setUsingId(null);
    }
  }

  async function handleDelete(fav: Favorite) {
    if (!confirm(`Delete favorite "${fav.name}"?`)) return;
    const res = await fetch(`/api/favorites/${fav.favoriteId}`, { method: "DELETE" });
    if (res.ok) {
      setFavorites((prev) => prev.filter((f) => f.favoriteId !== fav.favoriteId));
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 pb-20 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white px-4 py-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Favorites
        </h1>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-neutral-400">Loading...</p>
        ) : favorites.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">
            No favorites yet. Save one from a logged meal.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {favorites.map((fav) => (
              <div
                key={fav.favoriteId}
                className="relative rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <button
                  onClick={() => handleDelete(fav)}
                  className="absolute right-2 top-2 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  aria-label="Delete favorite"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1m2 0-.5 9a1 1 0 01-1 1h-5a1 1 0 01-1-1L4 4"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleUse(fav)}
                  disabled={usingId === fav.favoriteId}
                  className="w-full pr-4 text-left disabled:opacity-50"
                >
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {fav.name}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {Math.round(fav.totalCalories)} cal
                  </p>
                  <p className="mt-2 text-xs text-neutral-400">
                    {usingId === fav.favoriteId ? "Logging..." : "Tap to log"}
                  </p>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900">
          {toast}
        </div>
      )}

      <NavBar />
    </div>
  );
}
