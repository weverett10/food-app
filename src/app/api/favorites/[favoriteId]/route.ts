import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ favoriteId: string }> }
) {
  try {
    const { favoriteId } = await params;
    const db = getDb();
    const docRef = db.collection("favorites").doc(favoriteId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Favorite not found" }, { status: 404 });
    }
    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
