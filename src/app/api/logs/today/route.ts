import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import { getUserId } from "@/lib/requestUser";
import type { LogEntry } from "@/lib/types";

function toLogEntry(doc: FirebaseFirestore.QueryDocumentSnapshot): LogEntry {
  const data = doc.data();
  return {
    logId: doc.id,
    timestamp: (data.timestamp as Timestamp)?.toMillis?.() ?? Date.now(),
    photoThumbnailUrl: data.photoThumbnailUrl,
    photoPublicId: data.photoPublicId,
    userNote: data.userNote ?? null,
    foods: data.foods ?? [],
    totalCalories: data.totalCalories ?? 0,
    totalProtein: data.totalProtein ?? 0,
    totalCarbs: data.totalCarbs ?? 0,
    totalFat: data.totalFat ?? 0,
    assumptions: data.assumptions ?? "",
    isManuallyCorrected: data.isManuallyCorrected ?? false,
    createdAt: (data.createdAt as Timestamp)?.toMillis?.() ?? Date.now(),
    updatedAt: (data.updatedAt as Timestamp)?.toMillis?.() ?? Date.now(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const tzOffsetMinutes = Number(searchParams.get("tzOffsetMinutes") ?? "0");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date query param (YYYY-MM-DD) is required" },
        { status: 400 }
      );
    }

    const [year, month, day] = date.split("-").map(Number);
    const startUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0) + tzOffsetMinutes * 60_000;
    const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;

    const db = getDb();
    const snapshot = await db
      .collection("logs")
      .where("userId", "==", userId)
      .where("timestamp", ">=", Timestamp.fromMillis(startUtcMs))
      .where("timestamp", "<", Timestamp.fromMillis(endUtcMs))
      .orderBy("timestamp", "desc")
      .get();

    const logs = snapshot.docs.map(toLogEntry);

    const totals = logs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.totalCalories,
        protein: acc.protein + log.totalProtein,
        carbs: acc.carbs + log.totalCarbs,
        fat: acc.fat + log.totalFat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return NextResponse.json({ logs, totals });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
