import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { bulkUpdateReview, updateReview } from "@/lib/repository";

export async function POST(request: Request) {
  try {
    const auth = await requireRole(["supervisor"]);
    if (!auth.ok) return auth.response;

    const body = await request.json();

    if (body.scope === "bulk") {
      const summaries = await bulkUpdateReview({
        resident_ids: Array.isArray(body.resident_ids) ? body.resident_ids : [],
        month_key: body.month_key,
        review_status: body.review_status,
        review_note: body.review_note,
        reviewed_by: auth.user.id
      });

      return NextResponse.json({ success: true, summaries });
    }

    const summary = await updateReview({
      resident_id: body.resident_id,
      month_key: body.month_key,
      review_status: body.review_status,
      review_note: body.review_note,
      reviewed_by: auth.user.id
    });

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("[api/review][POST]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Review request failed."
      },
      { status: 500 }
    );
  }
}
