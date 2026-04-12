import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { listResidents, upsertManyDailyStatuses } from "@/lib/repository";

export async function POST(request: Request) {
  try {
    const auth = await requireRole(["nurse", "supervisor"]);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const recordDate = String(body.record_date || "");
    const roomNo = body.room_no ? String(body.room_no) : null;

    if (!recordDate) {
      return NextResponse.json({ success: false, error: "請提供記錄日期。" }, { status: 400 });
    }

    const residents = await listResidents();
    const activeResidents = residents.filter((resident) => resident.active);
    const targetResidents = roomNo
      ? activeResidents.filter((resident) => (resident.room_no ?? "") === roomNo)
      : activeResidents;

    const result = await upsertManyDailyStatuses(
      targetResidents.map((resident) => ({
        resident_id: resident.id,
        record_date: recordDate,
        status_type: "normal",
        original_note: null,
        family_note: null,
        created_by: auth.user.id
      }))
    );

    return NextResponse.json({ success: true, count: result.length, room_no: roomNo });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "批次設定正常失敗。" },
      { status: 500 }
    );
  }
}
