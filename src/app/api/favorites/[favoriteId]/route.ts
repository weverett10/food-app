import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { getUserId } from "@/lib/requestUser";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ favoriteId: string }> }
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { favoriteId } = await params;
    const db = getDb();
    const docRef = db.collection("favorites").doc(favoriteId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      return NextResponse.json({ error: "Favorite not found" }, { status: 404 });
    }
    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
