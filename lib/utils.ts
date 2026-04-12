import { clsx } from "clsx";
import { format, parseISO } from "date-fns";
import type { DailyStatus, DailyStatusType, ResidentCalendarDay } from "@/lib/types";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function toMonthKey(input: Date | string) {
  const date = typeof input === "string" ? parseISO(`${input}-01`) : input;
  return format(date, "yyyy-MM");
}

export function formatMonthLabel(monthKey: string) {
  const date = parseISO(`${monthKey}-01`);
  return `${format(date, "yyyy")}\u5e74${format(date, "MM")}\u6708`;
}

export function formatDateLabel(date: string) {
  return format(parseISO(date), "MM/dd");
}

export function getDaysInMonth(monthKey: string) {
  const start = new Date(`${monthKey}-01T00:00:00`);
  const year = start.getFullYear();
  const month = start.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    return `${monthKey}-${String(day).padStart(2, "0")}`;
  });
}

export function buildMonthlyCalendar(monthKey: string, statuses: DailyStatus[]): ResidentCalendarDay[] {
  const map = new Map(statuses.map((item) => [item.record_date, item]));

  return getDaysInMonth(monthKey).map((date) => {
    const found = map.get(date);
    const status: DailyStatusType = found ? found.status_type : "normal";
    return {
      date,
      status,
      note: found?.family_note ?? found?.original_note ?? found?.note,
      original_note: found?.original_note ?? found?.note,
      family_note: found?.family_note
    };
  });
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export function downloadBlob(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

export async function safeFetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const text = await response.text();

  let payload: unknown = null;

  if (text.trim()) {
    try {
      payload = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw new Error(text || "Server returned an error.");
      }
      throw new Error("Server returned invalid JSON.");
    }
  }

  if (!response.ok) {
    const errorMessage =
      typeof payload === "object" && payload !== null && "error" in payload
        ? String((payload as { error?: unknown }).error ?? "Server returned an error.")
        : text || "Server returned an error.";
    throw new Error(errorMessage);
  }

  if (response.status === 204 || payload === null) {
    return { success: true } as T;
  }

  return payload as T;
}
