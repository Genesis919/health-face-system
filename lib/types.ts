export type UserRole = "nurse" | "social_worker" | "supervisor";
export type DailyStatusType = "normal" | "unwell" | "hospital";
export type ReviewStatus = "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
};

export type Resident = {
  id: string;
  full_name: string;
  room_no: string | null;
  gender: string | null;
  birth_date: string | null;
  family_contact: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type DailyStatus = {
  id: string;
  resident_id: string;
  record_date: string;
  status_type: DailyStatusType;
  note: string | null;
  original_note: string | null;
  family_note: string | null;
  created_by: string;
  created_at: string;
};

export type MonthlySummary = {
  id: string;
  resident_id: string;
  month_key: string;
  nurse_summary: string | null;
  social_message: string | null;
  monthly_individual_note: string | null;
  review_status: ReviewStatus;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MonthlyCommonNote = {
  id: string;
  month_key: string;
  monthly_common_note: string | null;
  created_at: string;
  updated_at: string;
};

export type ResidentCalendarDay = {
  date: string;
  status: DailyStatusType;
  note?: string | null;
  original_note?: string | null;
  family_note?: string | null;
};
