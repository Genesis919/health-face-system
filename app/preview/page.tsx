import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionProfile } from "@/lib/auth";
import { listResidents } from "@/lib/repository";

export default async function PreviewPage() {
  const { user, profile } = await getSessionProfile();

  if (!user) {
    redirect("/login");
  }

  if (!profile || !["nurse", "social_worker", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const residents = await listResidents();
  const activeResidents = residents.filter((r) => r.active);

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <AppShell profile={profile}>
      <section className="card p-8">
        <h1 className="text-3xl font-black">健康臉譜預覽</h1>
        <p className="mt-3 text-lg text-stone-600">
          請選擇院民進行本月健康臉譜預覽
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeResidents.map((resident) => (
          <Link
            key={resident.id}
            href={`/preview/${resident.id}/${monthKey}`}
            className="card p-6 hover:-translate-y-1 transition"
          >
            <h2 className="text-xl font-bold">{resident.full_name}</h2>
            <p className="mt-2 text-stone-600">
              房號：{resident.room_number ?? "未設定"}
            </p>
          </Link>
        ))}
      </section>
    </AppShell>
  );
}