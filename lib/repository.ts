import { createAdminClient } from "@/lib/supabase/server";
import type { DailyStatus, DailyStatusType, MonthlyCommonNote, MonthlySummary, Profile, Resident } from "@/lib/types";

export async function listResidents() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("residents")
    .select("*")
    .order("active", { ascending: false })
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Resident[];
}

export async function upsertResident(input: Partial<Resident>) {
  const supabase = createAdminClient();
  const payload = {
    ...(input.id ? { id: input.id } : {}),
    full_name: input.full_name,
    room_no: input.room_no || null,
    gender: input.gender || null,
    birth_date: input.birth_date || null,
    family_contact: input.family_contact || null,
    active: input.active ?? true
  };

  const { data, error } = await supabase.from("residents").upsert(payload).select().single();
  if (error) throw error;
  return data as Resident;
}

export async function listDailyStatuses(monthKey: string, residentId?: string) {
  const supabase = createAdminClient();
  let query = supabase
    .from("daily_statuses")
    .select("*")
    .gte("record_date", `${monthKey}-01`)
    .lt("record_date", nextMonth(monthKey))
    .order("record_date", { ascending: true });

  if (residentId) query = query.eq("resident_id", residentId);

  const { data, error } = await query;
  if (error) throw error;
  return normalizeDailyStatuses(data ?? []);
}

export async function listDailyStatusesByDate(recordDate: string, residentIds?: string[]) {
  const supabase = createAdminClient();
  let query = supabase.from("daily_statuses").select("*").eq("record_date", recordDate);

  if (residentIds && residentIds.length > 0) {
    query = query.in("resident_id", residentIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return normalizeDailyStatuses(data ?? []);
}

export async function upsertDailyStatus(input: {
  resident_id: string;
  record_date: string;
  status_type: DailyStatusType;
  original_note?: string | null;
  family_note?: string | null;
  created_by: string;
}) {
  const supabase = createAdminClient();
  const payload = {
    ...input,
    status_type: input.status_type,
    original_note: input.original_note ?? null,
    family_note: input.family_note ?? null,
    note: input.original_note ?? null
  };

  console.log("[repository.upsertDailyStatus] request", payload);

  const { data, error } = await supabase
    .from("daily_statuses")
    .upsert(payload, { onConflict: "resident_id,record_date" })
    .select()
    .single();

  if (error) throw error;
  return normalizeDailyStatus(data) as DailyStatus;
}

export async function upsertManyDailyStatuses(
  inputs: Array<{
    resident_id: string;
    record_date: string;
    status_type: DailyStatusType;
    original_note?: string | null;
    family_note?: string | null;
    created_by: string;
  }>
) {
  if (inputs.length === 0) return [];

  const supabase = createAdminClient();
  const payload = inputs.map((item) => ({
    ...item,
    status_type: item.status_type,
    original_note: item.original_note ?? null,
    family_note: item.family_note ?? null,
    note: item.original_note ?? null
  }));

  console.log("[repository.upsertManyDailyStatuses] request", payload);

  const { data, error } = await supabase
    .from("daily_statuses")
    .upsert(payload, { onConflict: "resident_id,record_date" })
    .select();

  if (error) throw error;
  return normalizeDailyStatuses(data ?? []);
}

export async function listMonthlySummaries(monthKey: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("monthly_summaries")
    .select("*")
    .eq("month_key", monthKey)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as MonthlySummary[];
}

export async function getMonthlyCommonNote(monthKey: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("monthly_common_notes")
    .select("*")
    .eq("month_key", monthKey)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as MonthlyCommonNote | null;
}

export async function upsertMonthlySummary(input: {
  resident_id: string;
  month_key: string;
  nurse_summary?: string | null;
  social_message?: string | null;
  monthly_individual_note?: string | null;
}) {
  const supabase = createAdminClient();
  const payload = {
    ...input,
    monthly_individual_note: input.monthly_individual_note ?? input.social_message ?? null,
    social_message: input.social_message ?? input.monthly_individual_note ?? null
  };
  const { data, error } = await supabase
    .from("monthly_summaries")
    .upsert(payload, { onConflict: "resident_id,month_key" })
    .select()
    .single();

  if (error) throw error;
  return data as MonthlySummary;
}

export async function upsertMonthlyCommonNote(input: { month_key: string; monthly_common_note?: string | null }) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("monthly_common_notes")
    .upsert(
      {
        month_key: input.month_key,
        monthly_common_note: input.monthly_common_note ?? null
      },
      { onConflict: "month_key" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as MonthlyCommonNote;
}

export async function updateReview(input: {
  resident_id: string;
  month_key: string;
  review_status: "approved" | "rejected" | "pending";
  review_note?: string | null;
  reviewed_by?: string | null;
}) {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("monthly_summaries")
    .select("*")
    .eq("resident_id", input.resident_id)
    .eq("month_key", input.month_key)
    .single();

  const base = existing ?? { resident_id: input.resident_id, month_key: input.month_key };

  const { data, error } = await supabase
    .from("monthly_summaries")
    .upsert(
      {
        ...base,
        review_status: input.review_status,
        review_note: input.review_note ?? null,
        reviewed_by: input.reviewed_by ?? null,
        reviewed_at: input.review_status === "pending" ? null : new Date().toISOString()
      },
      { onConflict: "resident_id,month_key" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as MonthlySummary;
}

export async function bulkUpdateReview(input: {
  resident_ids: string[];
  month_key: string;
  review_status: "approved" | "rejected" | "pending";
  review_note?: string | null;
  reviewed_by?: string | null;
}) {
  if (input.resident_ids.length === 0) return [];

  const existingSummaries = await listMonthlySummaries(input.month_key);
  const existingMap = new Map(existingSummaries.map((item) => [item.resident_id, item]));

  const payload = input.resident_ids.map((residentId) => {
    const existing = existingMap.get(residentId);
    return {
      ...(existing ?? { resident_id: residentId, month_key: input.month_key }),
      resident_id: residentId,
      month_key: input.month_key,
      review_status: input.review_status,
      review_note: input.review_note ?? existing?.review_note ?? null,
      reviewed_by: input.reviewed_by ?? null,
      reviewed_at: input.review_status === "pending" ? null : new Date().toISOString()
    };
  });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("monthly_summaries")
    .upsert(payload, { onConflict: "resident_id,month_key" })
    .select();

  if (error) throw error;
  return (data ?? []) as MonthlySummary[];
}

export async function listProfiles() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .order("role", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Profile[];
}

function normalizeDailyStatuses(rows: unknown[]) {
  return rows.map((row) => normalizeDailyStatus(row)) as DailyStatus[];
}

function normalizeDailyStatus(row: unknown) {
  const item = row as DailyStatus & {
    status_type: DailyStatusType | "poor";
    original_note?: string | null;
    family_note?: string | null;
    note?: string | null;
  };
  const originalNote = item.original_note ?? item.note ?? null;
  const familyNote = item.family_note ?? null;
  return {
    ...item,
    status_type: item.status_type === "poor" ? "unwell" : item.status_type,
    original_note: originalNote,
    family_note: familyNote,
    note: originalNote
  };
}

function nextMonth(monthKey: string) {
  const current = new Date(`${monthKey}-01T00:00:00`);
  return new Date(current.getFullYear(), current.getMonth() + 1, 1).toISOString().slice(0, 10);
}
