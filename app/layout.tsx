import type { Metadata } from "next";
import "@/app/globals.css";
import { SITE_CONFIG } from "@/lib/site";

export const metadata: Metadata = {
  title: `${SITE_CONFIG.institutionName}｜${SITE_CONFIG.systemName}`,
  description: "適合照護機構使用的長輩健康臉譜系統"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
