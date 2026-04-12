import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ResidentManagement } from "@/components/resident-management";
import { getSessionProfile } from "@/lib/auth";
import { listResidents } from "@/lib/repository";

export default async function ResidentsPage() {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login");

  const residents = await listResidents();

  return (
    <AppShell profile={profile}>
      <ResidentManagement initialResidents={residents} role={profile.role} />
    </AppShell>
  );
}
