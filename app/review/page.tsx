import { redirect } from "next/navigation";
import { format } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { ReviewBoard } from "@/components/review-board";
import { getSessionProfile } from "@/lib/auth";
import { getMonthlyCommonNote, listDailyStatuses, listMonthlySummaries, listResidents } from "@/lib/repository";

export default async function ReviewPage() {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login");

  const monthKey = format(new Date(), "yyyy-MM");
  const [residents, summaries, dailyStatuses, commonNote] = await Promise.all([
    listResidents(),
    listMonthlySummaries(monthKey),
    listDailyStatuses(monthKey),
    getMonthlyCommonNote(monthKey)
  ]);

  return (
    <AppShell profile={profile}>
      <ReviewBoard
        initialResidents={residents.filter((item) => item.active)}
        initialMonthKey={monthKey}
        initialSummaries={summaries}
        initialDailyStatuses={dailyStatuses}
        initialCommonNote={commonNote?.monthly_common_note ?? null}
        role={profile.role}
      />
    </AppShell>
  );
}
