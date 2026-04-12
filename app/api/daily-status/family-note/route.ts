import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { generateFamilyNote } from "@/lib/family-note";

export async function POST(request: Request) {
  try {
    const auth = await requireRole(["nurse", "social_worker", "supervisor"]);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as { original_note?: unknown };
    const originalNote = typeof body.original_note === "string" ? body.original_note.trim() : "";

    if (!originalNote) {
      return NextResponse.json({ success: false, error: "請先輸入護理師原始備註。" }, { status: 400 });
    }

    const familyNote = generateFamilyNote(originalNote);

    return NextResponse.json({
      success: true,
      family_note: familyNote
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "轉換家屬說明失敗。" },
      { status: 500 }
    );
  }
}
