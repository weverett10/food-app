import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import { format } from "date-fns";
import { getUserId } from "@/lib/requestUser";
import type { LogEntry } from "@/lib/types";

const MAX_DAYS_PER_REQUEST = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateString(s: string): { year: number; month: number; day: number } {
  const [year, month, day] = s.split("-").map(Number);
  return { year, month, day };
}

function localDayStartUtcMs(dateStr: string, tzOffsetMinutes: number): number {
  const { year, month, day } = parseDateString(dateStr);
  return Date.UTC(year, month - 1, day, 0, 0, 0) + tzOffsetMinutes * 60_000;
}

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
    const tzOffsetMinutes = Number(searchParams.get("tzOffsetMinutes") ?? "0");
    const cursor = searchParams.get("cursor");
    let startDate = searchParams.get("startDate");
    let endDate = searchParams.get("endDate");

    if (cursor) {
      const cursorStartMs = localDayStartUtcMs(cursor, tzOffsetMinutes);
      const endDateMs = cursorStartMs - DAY_MS;
      endDate = format(new Date(endDateMs), "yyyy-MM-dd");
      const startDateMs = endDateMs - (MAX_DAYS_PER_REQUEST - 1) * DAY_MS;
      startDate = format(new Date(startDateMs), "yyyy-MM-dd");
    } else {
      if (!endDate) endDate = format(new Date(), "yyyy-MM-dd");
      if (!startDate) {
        const endMs = localDayStartUtcMs(endDate, tzOffsetMinutes);
        startDate = format(new Date(endMs - (MAX_DAYS_PER_REQUEST - 1) * DAY_MS), "yyyy-MM-dd");
      }
    }

    let startMs = localDayStartUtcMs(startDate, tzOffsetMinutes);
    const endMs = localDayStartUtcMs(endDate, tzOffsetMinutes) + DAY_MS;

    // Cap the span to MAX_DAYS_PER_REQUEST
    const spanDays = Math.round((endMs - startMs) / DAY_MS);
    if (spanDays > MAX_DAYS_PER_REQUEST) {
      startMs = endMs - MAX_DAYS_PER_REQUEST * DAY_MS;
      startDate = format(new Date(startMs), "yyyy-MM-dd");
    }

    const db = getDb();
    const snapshot = await db
      .collection("logs")
      .where("userId", "==", userId)
      .where("timestamp", ">=", Timestamp.fromMillis(startMs))
      .where("timestamp", "<", Timestamp.fromMillis(endMs))
      .orderBy("timestamp", "desc")
      .get();

    const logs = snapshot.docs.map(toLogEntry);

    const dayMap = new Map<string, LogEntry[]>();
    for (const log of logs) {
      const localDate = format(new Date(log.timestamp - tzOffsetMinutes * 60_000), "yyyy-MM-dd");
      const bucket = dayMap.get(localDate) ?? [];
      bucket.push(log);
      dayMap.set(localDate, bucket);
    }

    const days = Array.from(dayMap.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, dayLogs]) => ({
        date,
        logs: dayLogs,
        totals: dayLogs.reduce(
          (acc, l) => ({
            calories: acc.calories + l.totalCalories,
            protein: acc.protein + l.totalProtein,
            carbs: acc.carbs + l.totalCarbs,
            fat: acc.fat + l.totalFat,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        ),
      }));

    // Determine if there is any earlier data beyond this window
    const earlierSnapshot = await db
      .collection("logs")
      .where("userId", "==", userId)
      .where("timestamp", "<", Timestamp.fromMillis(startMs))
      .limit(1)
      .get();

    return NextResponse.json({
      days,
      hasMore: !earlierSnapshot.empty,
      nextCursor: startDate,
    });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
