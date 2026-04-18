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
  },
  {
    href: "/preview",
    label: "健康臉譜預覽",
    description: "查看本月健康臉譜預覽內容",
    icon: FileImage,
    roles: ["nurse", "social_worker", "manager"]
  }
];

function getRoleSummary(role: AppRole) {
  switch (role) {
    case "nurse":
      return "你目前可進行每日異常紀錄、查看月總結內容與健康臉譜預覽。";
    case "social_worker":
      return "你目前可查看院民資料、撰寫月總結與家屬關懷內容，並查看健康臉譜預覽。";
    case "manager":
      return "你目前可檢視全院資料、進行審核、匯出健康臉譜，並查看預覽內容。";
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
    return <div>找不到使用者資料</div>;
  }

  const role = profile.role as AppRole;

  const residents = await listResidents();
  const activeResidents = residents.filter((r) => r.active);
  const visibleCards = DASHBOARD_CARDS.filter((c) =>
    c.roles.includes(role)
  );

  return (
    <AppShell profile={profile}>
      <section className="card p-8">
        <h1 className="text-3xl font-black">{profile.full_name}</h1>
        <RoleBadge role={profile.role} />
        <p className="mt-2 text-stone-600">{getRoleSummary(role)}</p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {visibleCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="card p-6">
              <Icon className="h-6 w-6" />
              <h2 className="text-xl font-bold">{card.label}</h2>
              <p className="text-stone-600">{card.description}</p>
            </Link>
          );
        })}
      </section>

      <section className="card p-6">
        <p>目前院民數：{activeResidents.length}</p>
      </section>
    </AppShell>
  );
}