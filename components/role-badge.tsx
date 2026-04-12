import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/lib/types";

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className="inline-flex rounded-full bg-peach px-4 py-2 text-lg font-bold text-coral">
      {ROLE_LABELS[role]}
    </span>
  );
}
