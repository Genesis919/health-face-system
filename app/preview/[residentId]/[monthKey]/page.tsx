import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PreviewCard } from "@/components/preview-card";
import { getSessionProfile } from "@/lib/auth";
import { getPreviewData } from "@/lib/queries";

export default async function PreviewPage({
  params
}: {
  params: { residentId: string; monthKey: string };
}) {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login");

  const preview = await getPreviewData(params.monthKey, params.residentId);
  if (!preview.resident) notFound();

  return (
    <AppShell profile={profile}>
      <PreviewCard
        resident={preview.resident}
        monthKey={params.monthKey}
        calendar={preview.calendar}
        summary={preview.summary ?? null}
        commonNote={preview.commonNote}
        allowExport={preview.summary?.review_status === "approved"}
      />
    </AppShell>
  );
}
