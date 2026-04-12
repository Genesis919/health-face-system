"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

export function LoginCard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error || "登入失敗");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <section className="card p-8 md:p-10">
      <h2 className="text-3xl font-black">登入系統</h2>
      <p className="mt-3 text-lg leading-8 text-stone-600">
        使用 Supabase Auth 帳號登入，角色將依照系統設定自動帶入。
      </p>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-lg font-bold">電子郵件</label>
          <input className="field" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="mb-2 block text-lg font-bold">密碼</label>
          <input
            className="field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? <p className="rounded-2xl bg-rose/20 px-4 py-3 text-lg text-red-700">{error}</p> : null}
        <button type="submit" className="button-primary w-full text-xl" disabled={loading}>
          {loading ? <LoaderCircle className="h-6 w-6 animate-spin" /> : "登入"}
        </button>
      </form>
      <div className="mt-6 rounded-3xl bg-orange-50 p-5 text-base leading-7 text-stone-600">
        <p className="font-bold text-ink">建議先建立三組測試帳號：</p>
        <p>護理師、社工、主管各一組，並在 `profiles` 表中設定角色。</p>
      </div>
    </section>
  );
}
