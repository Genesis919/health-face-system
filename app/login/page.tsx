import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { LoginCard } from "@/components/login-card";
import { SITE_CONFIG } from "@/lib/site";

export default async function LoginPage() {
  const { user, profile } = await getSessionProfile();

  console.log("[page:/login]", {
    hasUser: Boolean(user),
    userId: user?.id ?? null,
    hasProfile: Boolean(profile),
    role: profile?.role ?? null
  });

  if (user && profile) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[36px] bg-gradient-to-br from-white via-orange-50 to-peach p-10 shadow-soft">
          <p className="mb-2 text-lg font-bold tracking-[0.08em] text-stone-500">{SITE_CONFIG.institutionName}</p>
          <p className="mb-3 inline-flex rounded-full bg-white px-4 py-2 text-base font-semibold text-coral">
            健康臉譜系統
          </p>
          <h1 className="max-w-2xl text-4xl font-black leading-tight text-ink md:text-6xl">
            每天只記錄異常，系統自動完成長輩健康臉譜。
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-9 text-stone-600">
            護理師快速填寫哭臉與住院狀態，社工月底補上給家屬的話，主管完成審核後即可匯出 PNG。
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="card p-6">
              <p className="text-4xl">😊</p>
              <p className="mt-4 text-xl font-bold">未填即健康良好</p>
            </div>
            <div className="card p-6">
              <p className="text-4xl">😢</p>
              <p className="mt-4 text-xl font-bold">健康不佳快速登記</p>
            </div>
            <div className="card p-6">
              <p className="text-4xl">🏥</p>
              <p className="mt-4 text-xl font-bold">就醫住院一鍵標記</p>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          {user && !profile ? (
            <section className="card border border-amber-200 p-6">
              <h2 className="text-2xl font-black text-amber-700">此帳號已登入，但尚未設定角色</h2>
              <p className="mt-3 text-lg leading-8 text-stone-700">
                目前偵測到你已經登入 Supabase，但 `profiles` 資料表中還沒有這個帳號的角色資料，所以系統不會再自動重導到首頁。
              </p>
              <p className="mt-3 text-lg leading-8 text-stone-700">
                請到 Supabase 的 `profiles` 表新增這位使用者，並設定 `full_name` 與 `role`。
              </p>
            </section>
          ) : null}

          <LoginCard />
        </div>
      </div>
    </main>
  );
}
