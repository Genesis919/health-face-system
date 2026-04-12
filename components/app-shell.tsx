"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarCheck2, ClipboardPenLine, FileImage, Home, LogOut, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import { SITE_CONFIG } from "@/lib/site";
import type { Profile } from "@/lib/types";

const navigation = [
  { href: "/dashboard", label: "首頁", icon: Home },
  { href: "/residents", label: "院民管理", icon: Users },
  { href: "/daily", label: "每日異常", icon: CalendarCheck2 },
  { href: "/monthly", label: "月總結", icon: ClipboardPenLine },
  { href: "/review", label: "審核匯出", icon: FileImage }
];

export function AppShell({
  profile,
  children
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="card p-6">
          <div className="rounded-[28px] bg-gradient-to-br from-coral to-orange-400 p-6 text-white">
            <p className="text-sm font-semibold opacity-80">{SITE_CONFIG.institutionName}</p>
            <p className="mt-2 text-lg opacity-90">{SITE_CONFIG.systemName}</p>
            <p className="mt-3 text-3xl font-black">{profile.full_name}</p>
            <p className="mt-2 text-lg">{ROLE_LABELS[profile.role]}</p>
          </div>
          <nav className="mt-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-4 text-lg font-semibold transition",
                    active ? "bg-peach text-coral" : "text-stone-600 hover:bg-orange-50"
                  )}
                >
                  <Icon className="h-6 w-6" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button className="button-secondary mt-8 w-full gap-2" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
            登出
          </button>
        </aside>
        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
