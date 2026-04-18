import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionProfile } from "@/lib/auth";
import { listResidents } from "@/lib/repository";

type PreviewRole = "nurse" | "social_worker" | "manager";

type ResidentLike = {
  id: string;
  full_name: string;
  active?: boolean;
  room_number?: string | null;
  room?: string | null;
  room_no?: string | null;
};

function getRoomLabel(resident: ResidentLike) {
  const rawRoom =
    resident.room_number ??
    resident.room ??
    resident.room_no ??
    "未分房";

  const roomText = String(rawRoom).trim();
  return roomText || "未分房";
}

export default async function PreviewPage() {
  const { user, profile } = await getSessionProfile();

  if (!user) {
    redirect("/login");
  }

  if (!profile || !["nurse", "social_worker", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const role = profile.role as PreviewRole;
  const residents = (await listResidents()) as ResidentLike[];
  const activeResidents = residents.filter((r) => r.active);

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const groupedResidents = activeResidents.reduce<Record<string, ResidentLike[]>>((acc, resident) => {
    const roomLabel = getRoomLabel(resident);
    if (!acc[roomLabel]) {
      acc[roomLabel] = [];
    }
    acc[roomLabel].push(resident);
    return acc;
  }, {});

  const sortedRoomEntries = Object.entries(groupedResidents).sort(([a], [b]) => {
    if (a === "未分房") return 1;
    if (b === "未分房") return -1;

    const aNum = Number(a.replace(/[^\d]/g, ""));
    const bNum = Number(b.replace(/[^\d]/g, ""));

    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
      return aNum - bNum;
    }

    return a.localeCompare(b, "zh-Hant");
  });

  return (
    <AppShell profile={profile}>
      <section className="card p-8">
        <h1 className="text-3xl font-black">健康臉譜預覽</h1>
        <p className="mt-3 text-lg leading-8 text-stone-600">
          目前角色：{role === "nurse" ? "護理師" : role === "social_worker" ? "社工" : "主管"}。
          請先選擇房號，再點選院民查看本月健康臉譜。
        </p>
        <p className="mt-2 text-base text-stone-500">預覽月份：{monthKey}</p>
      </section>

      <section className="space-y-6">
        {sortedRoomEntries.map(([roomLabel, roomResidents]) => (
          <section key={roomLabel} className="card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-coral">{roomLabel}</h2>
                <p className="mt-1 text-stone-500">共 {roomResidents.length} 位院民</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {roomResidents.map((resident) => (
                <Link
                  key={resident.id}
                  href={`/preview/${resident.id}/${monthKey}`}
                  className="rounded-[24px] border border-orange-100 bg-orange-50 p-5 transition hover:-translate-y-1 hover:bg-orange-100"
                >
                  <h3 className="text-xl font-bold">{resident.full_name}</h3>
                  <p className="mt-2 text-stone-600">點擊查看健康臉譜預覽</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </section>
    </AppShell>
  );
}