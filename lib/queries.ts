import { buildMonthlyCalendar } from "@/lib/utils";
import { getMonthlyCommonNote, listDailyStatuses, listMonthlySummaries, listResidents } from "@/lib/repository";

export async function getPreviewData(monthKey: string, residentId: string) {
  const [residents, dailyStatuses, monthlySummaries, commonNote] = await Promise.all([
    listResidents(),
    listDailyStatuses(monthKey, residentId),
    listMonthlySummaries(monthKey),
    getMonthlyCommonNote(monthKey)
  ]);

  const resident = residents.find((item) => item.id === residentId);
  const residentSummary = monthlySummaries.find((item) => item.resident_id === residentId);
  const summary = residentSummary
    ? {
        ...residentSummary,
        social_message: residentSummary.monthly_individual_note ?? residentSummary.social_message
      }
    : null;
  const calendar = buildMonthlyCalendar(monthKey, dailyStatuses);

  return {
    resident,
    summary,
    calendar,
    commonNote: commonNote?.monthly_common_note ?? null
  };
}
