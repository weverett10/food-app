import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import type { LogEntry } from "@/lib/types";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ favoriteId: string }> }
) {
  try {
    const { favoriteId } = await params;
    const db = getDb();
    const favRef = db.collection("favorites").doc(favoriteId);
    const favDoc = await favRef.get();
    if (!favDoc.exists) {
      return NextResponse.json({ error: "Favorite not found" }, { status: 404 });
    }
    const fav = favDoc.data()!;

    const now = FieldValue.serverTimestamp();
    const logRef = db.collection("logs").doc();
    await logRef.set({
      timestamp: now,
      photoThumbnailUrl: "",
      photoPublicId: "",
      userNote: null,
      foods: fav.foods ?? [],
      totalCalories: fav.totalCalories ?? 0,
      totalProtein: fav.totalProtein ?? 0,
      totalCarbs: fav.totalCarbs ?? 0,
      totalFat: fav.totalFat ?? 0,
      assumptions: `Logged from favorite "${fav.name}"`,
      isManuallyCorrected: false,
      createdAt: now,
      updatedAt: now,
    });

    await favRef.update({
      timesUsed: FieldValue.increment(1),
      lastUsedAt: now,
    });

    const nowMs = Date.now();
    const newLog: LogEntry = {
      logId: logRef.id,
      timestamp: nowMs,
      photoThumbnailUrl: "",
      photoPublicId: "",
      userNote: null,
      foods: fav.foods ?? [],
      totalCalories: fav.totalCalories ?? 0,
      totalProtein: fav.totalProtein ?? 0,
      totalCarbs: fav.totalCarbs ?? 0,
      totalFat: fav.totalFat ?? 0,
      assumptions: `Logged from favorite "${fav.name}"`,
      isManuallyCorrected: false,
      createdAt: nowMs,
      updatedAt: nowMs,
    };

    return NextResponse.json(newLog);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
