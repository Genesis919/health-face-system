import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

export async function getSessionProfile() {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log("[auth.getSessionProfile]", {
      hasUser: false,
      userId: null,
      hasProfile: false,
      role: null,
      authError: authError?.message ?? null
    });
    return { user: null, profile: null };
  }

  const admin = createAdminClient();
  const { data, error: profileError } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (data as Profile | null) ?? null;

  console.log("[auth.getSessionProfile]", {
    hasUser: true,
    userId: user.id,
    hasProfile: Boolean(profile),
    role: profile?.role ?? null,
    profileError: profileError?.message ?? null
  });

  return { user, profile };
}

export async function requireRole(allowedRoles?: UserRole[]) {
  const session = await getSessionProfile();

  console.log("[auth.requireRole]", {
    allowedRoles: allowedRoles ?? null,
    hasUser: Boolean(session.user),
    userId: session.user?.id ?? null,
    hasProfile: Boolean(session.profile),
    role: session.profile?.role ?? null
  });

  if (!session.user || !session.profile) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "請先登入，並確認此帳號已建立 profiles 角色資料。" },
        { status: 401 }
      )
    };
  }

  if (allowedRoles && !allowedRoles.includes(session.profile.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "您沒有此功能權限。" }, { status: 403 })
    };
  }

  return {
    ok: true as const,
    user: session.user,
    profile: session.profile
  };
}
