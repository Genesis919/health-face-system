import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { upsertResident } from "@/lib/repository";

export async function POST(request: Request) {
  const auth = await requireRole(["social_worker", "supervisor"]);
  if (!auth.ok) return auth.response;

  const body = await request.json();

  for (const row of body.rows as Array<Record<string, string | boolean>>) {
    if (!row.full_name) continue;
    await upsertResident({
      full_name: String(row.full_name),
      room_no: row.room_no ? String(row.room_no) : null,
      gender: row.gender ? String(row.gender) : null,
      birth_date: row.birth_date ? String(row.birth_date) : null,
      family_contact: row.family_contact ? String(row.family_contact) : null,
      active: row.active !== false
    });
  }

  return NextResponse.json({ ok: true });
}
