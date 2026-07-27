import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import { uploadThumbnail } from "@/lib/cloudinary";
import { prepareForAnalysis, prepareThumbnail } from "@/lib/image";
import { analyzeFoodPhoto, type ImageMediaType } from "@/lib/anthropic";
import { getUserId } from "@/lib/requestUser";
import type { LogEntry } from "@/lib/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES: Record<string, ImageMediaType> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/heic": "image/jpeg", // sharp/libvips transcodes HEIC input to JPEG output
};

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const photo = formData.get("photo");
    const note = formData.get("note");

    if (!photo || !(photo instanceof Blob)) {
      return NextResponse.json({ error: "No photo provided" }, { status: 400 });
    }

    if (!(photo.type in ALLOWED_TYPES)) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPEG, PNG, WEBP, or HEIC." },
        { status: 400 }
      );
    }

    if (photo.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Photo is too large (max 10MB)." },
        { status: 400 }
      );
    }

    const userNote = typeof note === "string" && note.trim() ? note.trim() : null;

    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { base64, mediaType } = await prepareForAnalysis(buffer);

    let analysis;
    try {
      analysis = await analyzeFoodPhoto(base64, mediaType, userNote);
    } catch {
      return NextResponse.json(
        { error: "Couldn't analyze that photo, try again." },
        { status: 502 }
      );
    }

    const thumbnailDataUri = await prepareThumbnail(buffer);
    const { secureUrl, publicId } = await uploadThumbnail(thumbnailDataUri);

    const db = getDb();
    const now = Date.now();
    const docRef = db.collection("logs").doc();

    const logData = {
      userId,
      timestamp: FieldValue.serverTimestamp(),
      photoThumbnailUrl: secureUrl,
      photoPublicId: publicId,
      userNote,
      foods: analysis.foods,
      totalCalories: analysis.totalCalories,
      totalProtein: analysis.totalProtein,
      totalCarbs: analysis.totalCarbs,
      totalFat: analysis.totalFat,
      assumptions: analysis.assumptions,
      isManuallyCorrected: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await docRef.set(logData);

    const responseLog: LogEntry = {
      logId: docRef.id,
      timestamp: now,
      photoThumbnailUrl: secureUrl,
      photoPublicId: publicId,
      userNote,
      foods: analysis.foods,
      totalCalories: analysis.totalCalories,
      totalProtein: analysis.totalProtein,
      totalCarbs: analysis.totalCarbs,
      totalFat: analysis.totalFat,
      assumptions: analysis.assumptions,
      isManuallyCorrected: false,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json(responseLog, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
