import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getMonthlyCommonNote, listMonthlySummaries, upsertMonthlyCommonNote, upsertMonthlySummary } from "@/lib/repository";

export async function GET(request: Request) {
  const auth = await requireRole(["nurse", "social_worker", "supervisor"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  if (!month) return NextResponse.json({ error: "請提供月份" }, { status: 400 });

  const [summaries, commonNote] = await Promise.all([listMonthlySummaries(month), getMonthlyCommonNote(month)]);
  return NextResponse.json({ summaries, common_note: commonNote });
}

export async function POST(request: Request) {
  const auth = await requireRole(["nurse", "social_worker", "supervisor"]);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  if (body.scope === "common") {
    const commonNote = await upsertMonthlyCommonNote({
      month_key: body.month_key,
      monthly_common_note: body.monthly_common_note
    });

    return NextResponse.json({ success: true, common_note: commonNote });
  }

  const summary = await upsertMonthlySummary({
    resident_id: body.resident_id,
    month_key: body.month_key,
    nurse_summary: body.nurse_summary,
    social_message: body.social_message,
    monthly_individual_note: body.monthly_individual_note
  });

  return NextResponse.json({ success: true, summary });
}
