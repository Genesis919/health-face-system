import { redirect } from "next/navigation";
import { format } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { DailyStatusBoard } from "@/components/daily-status-board";
import { getSessionProfile } from "@/lib/auth";
import { listDailyStatuses, listResidents } from "@/lib/repository";

export default async function DailyPage() {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login");

  const today = format(new Date(), "yyyy-MM-dd");
  const monthKey = today.slice(0, 7);
  const [residents, statuses] = await Promise.all([listResidents(), listDailyStatuses(monthKey)]);

  return (
    <AppShell profile={profile}>
      <DailyStatusBoard
        currentDate={today}
        initialResidents={residents.filter((item) => item.active)}
        initialStatuses={statuses.filter((item) => item.record_date === today)}
        initialMonthStatuses={statuses}
        role={profile.role}
      />
    </AppShell>
  );
}
