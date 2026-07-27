import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import { getUserId } from "@/lib/requestUser";
import type { Favorite, FoodItem } from "@/lib/types";

function toFavorite(id: string, data: FirebaseFirestore.DocumentData): Favorite {
  return {
    favoriteId: id,
    name: data.name,
    foods: data.foods ?? [],
    totalCalories: data.totalCalories ?? 0,
    totalProtein: data.totalProtein ?? 0,
    totalCarbs: data.totalCarbs ?? 0,
    totalFat: data.totalFat ?? 0,
    timesUsed: data.timesUsed ?? 0,
    lastUsedAt: (data.lastUsedAt as Timestamp)?.toMillis?.() ?? 0,
    createdAt: (data.createdAt as Timestamp)?.toMillis?.() ?? 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const snapshot = await db
      .collection("favorites")
      .where("userId", "==", userId)
      .orderBy("lastUsedAt", "desc")
      .get();
    const favorites = snapshot.docs.map((doc) => toFavorite(doc.id, doc.data()));
    return NextResponse.json({ favorites });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const db = getDb();
    let name: string;
    let foods: FoodItem[];
    let totalCalories: number;
    let totalProtein: number;
    let totalCarbs: number;
    let totalFat: number;

    if (body.logId) {
      const logDoc = await db.collection("logs").doc(body.logId).get();
      if (!logDoc.exists || logDoc.data()?.userId !== userId) {
        return NextResponse.json({ error: "Log not found" }, { status: 404 });
      }
      const logData = logDoc.data()!;
      name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Favorite";
      foods = logData.foods ?? [];
      totalCalories = logData.totalCalories ?? 0;
      totalProtein = logData.totalProtein ?? 0;
      totalCarbs = logData.totalCarbs ?? 0;
      totalFat = logData.totalFat ?? 0;
    } else if (body.name && body.foods) {
      name = String(body.name).trim();
      foods = body.foods as FoodItem[];
      totalCalories =
        body.totals?.calories ?? foods.reduce((s, f) => s + (Number(f.calories) || 0), 0);
      totalProtein =
        body.totals?.protein ?? foods.reduce((s, f) => s + (Number(f.protein) || 0), 0);
      totalCarbs = body.totals?.carbs ?? foods.reduce((s, f) => s + (Number(f.carbs) || 0), 0);
      totalFat = body.totals?.fat ?? foods.reduce((s, f) => s + (Number(f.fat) || 0), 0);
    } else {
      return NextResponse.json(
        { error: "Provide either logId or name + foods" },
        { status: 400 }
      );
    }

    const docRef = db.collection("favorites").doc();
    const now = FieldValue.serverTimestamp();
    await docRef.set({
      userId,
      name,
      foods,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      timesUsed: 0,
      lastUsedAt: now,
      createdAt: now,
    });

    const created = await docRef.get();
    return NextResponse.json(toFavorite(created.id, created.data()!));
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
