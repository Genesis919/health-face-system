import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { listDailyStatuses, listDailyStatusesByDate, upsertDailyStatus } from "@/lib/repository";
import type { DailyStatusType } from "@/lib/types";

const ALLOWED_STATUS = new Set(["normal", "unwell", "hospital"]);

function normalizeStatusType(value: unknown): DailyStatusType | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return ALLOWED_STATUS.has(normalized) ? (normalized as DailyStatusType) : null;
}

export async function GET(request: Request) {
  try {
    const auth = await requireRole(["nurse", "social_worker", "supervisor"]);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const month = searchParams.get("month") || date?.slice(0, 7);

    if (date) {
      const statuses = await listDailyStatusesByDate(date);
      return NextResponse.json({ success: true, statuses });
    }

    if (!month) {
      return NextResponse.json({ success: false, error: "請提供日期或月份。" }, { status: 400 });
    }

    const statuses = await listDailyStatuses(month);
    return NextResponse.json({ success: true, statuses });
  } catch (error) {
    console.error("[api/daily-status][GET]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "讀取每日異常失敗。" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown> | null = null;

  try {
    const auth = await requireRole(["nurse", "supervisor"]);
    if (!auth.ok) return auth.response;

    body = await request.json();

    const statusType = normalizeStatusType(body?.status_type);

    console.log("[api/daily-status][POST] request body", body);
    console.log("[api/daily-status][POST] status_type", body?.status_type ?? null);
    console.log("[api/daily-status][POST] normalized status_type", statusType);

    if (!body?.resident_id || !body?.record_date || !statusType) {
      return NextResponse.json(
        { success: false, error: "resident_id、record_date、status_type 為必填，且 status_type 僅支援 normal、unwell、hospital。" },
        { status: 400 }
      );
    }

    const status = await upsertDailyStatus({
      resident_id: String(body.resident_id).trim(),
      record_date: String(body.record_date).trim(),
      status_type: statusType,
      original_note: typeof body.original_note === "string" ? body.original_note.trim() : null,
      family_note: typeof body.family_note === "string" ? body.family_note.trim() : null,
      created_by: auth.user.id
    });

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("[api/daily-status][POST] request body", body);
    console.error("[api/daily-status][POST] status_type", body?.status_type ?? null);

    if (error instanceof Error) {
      console.error("[api/daily-status][POST] error message", error.message);
      console.error("[api/daily-status][POST] stack", error.stack);
    } else {
      console.error("[api/daily-status][POST] unknown error", error);
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "儲存每日異常失敗。" },
      { status: 500 }
    );
  }
}
