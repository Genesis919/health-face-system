import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";

export default async function HomePage() {
  const { user, profile } = await getSessionProfile();

  console.log("[page:/]", {
    hasUser: Boolean(user),
    userId: user?.id ?? null,
    hasProfile: Boolean(profile),
    role: profile?.role ?? null
  });

  if (!user) {
    redirect("/login");
  }

  if (!profile) {
    redirect("/auth-error");
  }

  redirect("/dashboard");
}
