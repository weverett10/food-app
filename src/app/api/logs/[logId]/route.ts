import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import { deleteImage } from "@/lib/cloudinary";
import type { FoodItem, LogEntry } from "@/lib/types";

function docToLogEntry(id: string, data: FirebaseFirestore.DocumentData): LogEntry {
  return {
    logId: id,
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    const { logId } = await params;
    const db = getDb();
    const doc = await db.collection("logs").doc(logId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }
    return NextResponse.json(docToLogEntry(doc.id, doc.data()!));
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    const { logId } = await params;
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const db = getDb();
    const docRef = db.collection("logs").doc(logId);
    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    const update: Record<string, unknown> = {
      isManuallyCorrected: true,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (Array.isArray(body.foods)) {
      const foods = body.foods as FoodItem[];
      update.foods = foods;
      update.totalCalories = foods.reduce((s, f) => s + (Number(f.calories) || 0), 0);
      update.totalProtein = foods.reduce((s, f) => s + (Number(f.protein) || 0), 0);
      update.totalCarbs = foods.reduce((s, f) => s + (Number(f.carbs) || 0), 0);
      update.totalFat = foods.reduce((s, f) => s + (Number(f.fat) || 0), 0);
    } else {
      if (typeof body.totalCalories === "number") update.totalCalories = body.totalCalories;
      if (typeof body.totalProtein === "number") update.totalProtein = body.totalProtein;
      if (typeof body.totalCarbs === "number") update.totalCarbs = body.totalCarbs;
      if (typeof body.totalFat === "number") update.totalFat = body.totalFat;
    }

    await docRef.update(update);
    const updated = await docRef.get();
    return NextResponse.json(docToLogEntry(updated.id, updated.data()!));
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    const { logId } = await params;
    const db = getDb();
    const docRef = db.collection("logs").doc(logId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }
    const publicId = doc.data()?.photoPublicId;
    await docRef.delete();
    if (publicId) {
      await deleteImage(publicId).catch(() => {});
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
