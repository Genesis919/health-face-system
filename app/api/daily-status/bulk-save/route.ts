import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { upsertManyDailyStatuses } from "@/lib/repository";
import type { DailyStatusType } from "@/lib/types";

const ALLOWED_STATUS = new Set(["normal", "unwell", "hospital"]);

function normalizeStatusType(value: unknown): DailyStatusType | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return ALLOWED_STATUS.has(normalized) ? (normalized as DailyStatusType) : null;
}

export async function POST(request: Request) {
  let body: Record<string, unknown> | null = null;

  try {
    const auth = await requireRole(["nurse", "supervisor"]);
    if (!auth.ok) return auth.response;

    body = await request.json();
    const recordDate = typeof body.record_date === "string" ? body.record_date.trim() : "";
    const items = Array.isArray(body.items) ? body.items : [];

    if (!recordDate) {
      return NextResponse.json({ success: false, error: "record_date 為必填。" }, { status: 400 });
    }

    if (items.length === 0) {
      return NextResponse.json({ success: false, error: "請提供至少一筆院民狀態。" }, { status: 400 });
    }

    for (const item of items) {
      const row = item as Record<string, unknown>;
      const statusType = normalizeStatusType(row.status_type);

      if (!row.resident_id || !statusType) {
        return NextResponse.json(
          { success: false, error: "resident_id 與 status_type 為必填，且 status_type 僅支援 normal、unwell、hospital。" },
          { status: 400 }
        );
      }
    }

    const result = await upsertManyDailyStatuses(
      items.map((item) => {
        const row = item as Record<string, unknown>;
        const statusType = normalizeStatusType(row.status_type);

        if (!statusType) {
          throw new Error(`不支援的 status_type：${String(row.status_type ?? "")}`);
        }

        return {
          resident_id: String(row.resident_id).trim(),
          record_date: recordDate,
          status_type: statusType,
          original_note:
            statusType === "normal" ? null : typeof row.original_note === "string" ? row.original_note.trim() : null,
          family_note:
            statusType === "normal" ? null : typeof row.family_note === "string" ? row.family_note.trim() : null,
          created_by: auth.user.id
        };
      })
    );

    return NextResponse.json({ success: true, count: result.length, statuses: result });
  } catch (error) {
    console.error("[api/daily-status/bulk-save][POST] request body", body);
    if (error instanceof Error) {
      console.error("[api/daily-status/bulk-save][POST] error message", error.message);
      console.error("[api/daily-status/bulk-save][POST] stack", error.stack);
    } else {
      console.error("[api/daily-status/bulk-save][POST] unknown error", error);
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "整房儲存每日異常失敗。" },
      { status: 500 }
    );
  }
}
