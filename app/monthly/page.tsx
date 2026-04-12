import { redirect } from "next/navigation";
import { format } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { MonthlySummaryBoard } from "@/components/monthly-summary-board";
import { getSessionProfile } from "@/lib/auth";
import { getMonthlyCommonNote, listMonthlySummaries, listResidents } from "@/lib/repository";

export default async function MonthlyPage() {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login");

  const monthKey = format(new Date(), "yyyy-MM");
  const [residents, summaries, commonNote] = await Promise.all([
    listResidents(),
    listMonthlySummaries(monthKey),
    getMonthlyCommonNote(monthKey)
  ]);

  return (
    <AppShell profile={profile}>
      <MonthlySummaryBoard
        initialResidents={residents.filter((item) => item.active)}
        initialMonthKey={monthKey}
        initialSummaries={summaries}
        initialCommonNote={commonNote}
        role={profile.role}
      />
    </AppShell>
  );
}
