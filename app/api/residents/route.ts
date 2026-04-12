import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { listResidents, upsertResident } from "@/lib/repository";

export async function GET() {
  try {
    const auth = await requireRole(["nurse", "social_worker", "supervisor"]);
    if (!auth.ok) return auth.response;

    const residents = await listResidents();
    return NextResponse.json({ success: true, residents });
  } catch (error) {
    console.error("[api/residents][GET]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "讀取院民資料失敗。"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(["social_worker", "supervisor"]);
    if (!auth.ok) return auth.response;

    const body = await request.json();

    if (!body.full_name || String(body.full_name).trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "請填寫院民姓名。" },
        { status: 400 }
      );
    }

    const resident = await upsertResident({
      id: body.id,
      full_name: String(body.full_name).trim(),
      room_no: body.room_no || null,
      gender: body.gender || null,
      birth_date: body.birth_date || null,
      family_contact: body.family_contact || null,
      active: body.active ?? true
    });

    return NextResponse.json({ success: true, resident });
  } catch (error) {
    console.error("[api/residents][POST]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "新增院民失敗。"
      },
      { status: 500 }
    );
  }
}
