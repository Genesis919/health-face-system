import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";

export default async function AuthErrorPage() {
  const { user, profile } = await getSessionProfile();

  console.log("[page:/auth-error]", {
    hasUser: Boolean(user),
    userId: user?.id ?? null,
    hasProfile: Boolean(profile),
    role: profile?.role ?? null
  });

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <section className="card p-8">
          <p className="inline-flex rounded-full bg-amber-100 px-4 py-2 text-lg font-bold text-amber-700">
            登入狀態異常
          </p>
          <h1 className="mt-5 text-4xl font-black">帳號已登入，但系統找不到角色資料</h1>
          <p className="mt-4 text-lg leading-8 text-stone-700">
            這通常代表 Supabase Auth 已經有這位使用者，但 `profiles` 資料表中沒有對應紀錄，或 `role` 尚未設定。
          </p>
          <div className="mt-6 rounded-[24px] bg-orange-50 p-5">
            <p className="text-lg font-bold text-ink">請到 Supabase 檢查：</p>
            <p className="mt-2 text-lg leading-8 text-stone-700">1. `profiles.id` 是否等於使用者的 User UID</p>
            <p className="text-lg leading-8 text-stone-700">2. `profiles.role` 是否為 `nurse`、`social_worker`、`supervisor`</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login" className="button-secondary">
              回登入頁
            </Link>
            <Link href="/dashboard" className="button-ghost">
              再試一次 Dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
