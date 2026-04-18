import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { upsertManyDailyStatuses } from "@/lib/repository";
import type { DailyStatusType } from "@/lib/types";

const ALLOWED_STATUS = new Set<DailyStatusType>(["normal", "unwell", "hospital"]);

type BulkSaveItemInput = {
  resident_id: string;
  status_type: DailyStatusType;
  original_note?: string | null;
  family_note?: string | null;
};

type BulkSaveBody = {
  record_date: string;
  items: BulkSaveItemInput[];
};

function normalizeStatusType(value: unknown): DailyStatusType | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return ALLOWED_STATUS.has(normalized as DailyStatusType) ? (normalized as DailyStatusType) : null;
}

function parseBody(raw: unknown): BulkSaveBody | null {
  if (!raw || typeof raw !== "object") return null;

  const bodyRecord = raw as Record<string, unknown>;
  const recordDate = typeof bodyRecord.record_date === "string" ? bodyRecord.record_date.trim() : "";
  const itemsRaw = Array.isArray(bodyRecord.items) ? bodyRecord.items : null;

  if (!recordDate || !itemsRaw) return null;

  const items: BulkSaveItemInput[] = [];

  for (const itemRaw of itemsRaw) {
    if (!itemRaw || typeof itemRaw !== "object") return null;

    const itemRecord = itemRaw as Record<string, unknown>;
    const residentId =
      typeof itemRecord.resident_id === "string" ? itemRecord.resident_id.trim() : String(itemRecord.resident_id ?? "").trim();
    const statusType = normalizeStatusType(itemRecord.status_type);

    if (!residentId || !statusType) return null;

    items.push({
      resident_id: residentId,
      status_type: statusType,
      original_note: typeof itemRecord.original_note === "string" ? itemRecord.original_note.trim() : null,
      family_note: typeof itemRecord.family_note === "string" ? itemRecord.family_note.trim() : null
    });
  }

  return { record_date: recordDate, items };
}

export async function POST(request: Request) {
  let requestBody: unknown = null;

  try {
    const auth = await requireRole(["nurse", "supervisor"]);
    if (!auth.ok) return auth.response;

    requestBody = await request.json();
    const parsed = parseBody(requestBody);

    if (!parsed) {
      return NextResponse.json(
        {
          success: false,
          error: "Request body is invalid. Expect record_date and items with resident_id/status_type."
        },
        { status: 400 }
      );
    }

    if (parsed.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "items cannot be empty." },
        { status: 400 }
      );
    }

    const payload = parsed.items.map((item: BulkSaveItemInput) => ({
      resident_id: item.resident_id,
      record_date: parsed.record_date,
      status_type: item.status_type,
      original_note: item.status_type === "normal" ? null : item.original_note ?? null,
      family_note: item.status_type === "normal" ? null : item.family_note ?? null,
      created_by: auth.user.id
    }));

    const result = await upsertManyDailyStatuses(payload);
    return NextResponse.json({ success: true, count: result.length, statuses: result });
  } catch (error) {
    console.error("[api/daily-status/bulk-save][POST] request body", requestBody);
    console.error("[api/daily-status/bulk-save][POST] error", error);

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to save room records." },
      { status: 500 }
    );
  }
}
