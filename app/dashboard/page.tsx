import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, ClipboardCheck, FileImage, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RoleBadge } from "@/components/role-badge";
import { getSessionProfile } from "@/lib/auth";
import { listResidents } from "@/lib/repository";
import { ROLE_LABELS } from "@/lib/constants";

type AppRole = "nurse" | "social_worker" | "manager";

type DashboardCard = {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
};

const DASHBOARD_CARDS: DashboardCard[] = [
  {
    href: "/daily",
    label: "每日異常紀錄",
    description: "護理師記錄哭臉與住院狀態",
    icon: CalendarDays,
    roles: ["nurse", "manager"]
  },
  {
    href: "/monthly",
    label: "月總結",
    description: "護理與社工月底補上關懷內容",
    icon: ClipboardCheck,
    roles: ["nurse", "social_worker", "manager"]
  },
  {
    href: "/residents",
    label: "院民管理",
    description: "建立院民、批次匯入、停用名單",
    icon: Users,
    roles: ["social_worker", "manager"]
  },
  {
    href: "/review",
    label: "主管審核與匯出",
    description: "檢視健康臉譜並輸出 PNG",
    icon: FileImage,
    roles: ["manager"]
  }
];

function getRoleSummary(role: AppRole) {
  switch (role) {
    case "nurse":
      return "你目前可進行每日異常紀錄、查看月總結內容。";
    case "social_worker":
      return "你目前可查看院民資料、撰寫月總結與家屬關懷內容。";
    case "manager":
      return "你目前可檢視全院資料、進行審核並匯出健康臉譜。";
    default:
      return "";
  }
}

export default async function DashboardPage() {
  const { user, profile } = await getSessionProfile();

  if (!user) {
    redirect("/login");
  }

  if (!profile) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <section className="card p-8">
            <p className="inline-flex rounded-full bg-amber-100 px-4 py-2 text-lg font-bold text-amber-700">
              無法進入 Dashboard
            </p>
            <h1 className="mt-5 text-4xl font-black">此帳號已登入，但尚未設定角色資料</h1>
            <p className="mt-4 text-lg leading-8 text-stone-700">
              系統已確認你登入成功，但在 profiles 資料表中找不到對應資料，因此目前無法判斷你是護理師、社工還是主管。
            </p>
            <div className="mt-6 rounded-[24px] bg-orange-50 p-5">
              <p className="text-lg font-bold text-ink">請檢查以下項目：</p>
              <p className="mt-2 text-lg leading-8 text-stone-700">1. profiles.id 是否等於 Supabase Auth 的 User UID</p>
              <p className="text-lg leading-8 text-stone-700">2. profiles.full_name 是否已填寫</p>
              <p className="text-lg leading-8 text-stone-700">3. profiles.role 是否為 nurse、social_worker、manager 其中之一</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const role = profile.role as AppRole;

  if (!["nurse", "social_worker", "manager"].includes(role)) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <section className="card p-8">
            <p className="inline-flex rounded-full bg-amber-100 px-4 py-2 text-lg font-bold text-amber-700">
              角色設定異常
            </p>
            <h1 className="mt-5 text-4xl font-black">此帳號的角色資料無法辨識</h1>
            <p className="mt-4 text-lg leading-8 text-stone-700">
              目前讀到的角色為：{String(profile.role)}，請至 profiles 資料表確認 role 是否為 nurse、social_worker 或 manager。
            </p>
          </section>
        </div>
      </main>
    );
  }

  const residents = await listResidents();
  const activeResidents = residents.filter((item) => item.active);
  const visibleCards = DASHBOARD_CARDS.filter((card) => card.roles.includes(role));

  return (
    <AppShell profile={profile}>
      <section className="card p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-semibold text-coral">歡迎回來</p>
            <h1 className="mt-2 text-4xl font-black">{profile.full_name}</h1>
            <div className="mt-4">
              <RoleBadge role={profile.role} />
            </div>
            <p className="mt-4 text-lg leading-8 text-stone-600">{getRoleSummary(role)}</p>
          </div>
          <div className="rounded-[28px] bg-orange-50 p-6 text-center">
            <p className="text-lg text-stone-500">目前啟用院民</p>
            <p className="mt-2 text-5xl font-black text-coral">{activeResidents.length}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {visibleCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="card p-7 transition hover:-translate-y-1">
              <div className="flex items-start gap-4">
                <div className="rounded-3xl bg-peach p-4 text-coral">
                  <Icon className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{card.label}</h2>
                  <p className="mt-3 text-lg leading-8 text-stone-600">{card.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="card p-8">
        <h2 className="text-3xl font-black">系統角色說明</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {Object.entries(ROLE_LABELS).map(([key, label]) => (
            <div key={key} className="rounded-[24px] border border-orange-100 bg-orange-50 p-5">
              <p className="text-xl font-bold">{label}</p>
              <p className="mt-2 text-lg leading-8 text-stone-600">
                {key === "nurse" && "每日只需填異常狀況，並可查看月總結內容。"}
                {key === "social_worker" && "可查看院民資料，月底補上給家屬的話與月總結內容。"}
                {key === "manager" && "可審核每位院民的健康臉譜內容並匯出圖片。"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}