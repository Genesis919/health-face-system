"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download } from "lucide-react";
import { REVIEW_LABELS, STATUS_FACE, STATUS_LABELS } from "@/lib/constants";
import { SITE_CONFIG } from "@/lib/site";
import { downloadDataUrl, formatDateLabel, formatMonthLabel } from "@/lib/utils";
import type { DailyStatusType, MonthlySummary, Resident, ResidentCalendarDay } from "@/lib/types";

type HealthFaceCardProps = {
  resident: Resident;
  monthKey: string;
  calendar: ResidentCalendarDay[];
  summary: MonthlySummary | null;
  commonNote?: string | null;
};

type PreviewCardProps = HealthFaceCardProps & {
  allowExport?: boolean;
};

const TEXT = {
  roomFallback: "\u672a\u5206\u914d",
  reviewStatus: "\u5be9\u6838\u72c0\u614b",
  monthlyAbnormal: "\u672c\u6708\u7570\u5e38\u8207\u5099\u8a3b",
  noAbnormal: "\u672c\u6708\u5c1a\u7121\u5065\u5eb7\u7570\u5e38\u6216\u4f4f\u9662\u7d00\u9304\u3002",
  noNote: "\u5c1a\u7121\u5099\u8a3b",
  nurseSummary: "\u672c\u6708\u6574\u9ad4\u72c0\u6cc1",
  commonNote: "\u672c\u6708\u901a\u77e5",
  familyMessage: "\u7d66\u5bb6\u5c6c\u7684\u8a71",
  exporting: "\u532f\u51fa\u4e2d...",
  exportPng: "\u532f\u51fa PNG"
} as const;

export function HealthFaceCard({ resident, monthKey, calendar, summary, commonNote }: HealthFaceCardProps) {
  const abnormalDays = calendar.filter((day) => day.status !== "normal");
  const familyMessage = summary?.monthly_individual_note ?? summary?.social_message ?? null;

  return (
    <div className="card overflow-hidden rounded-[36px] bg-gradient-to-br from-white to-orange-50 p-8">
      <div className="flex flex-col gap-5 border-b border-orange-100 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-lg font-bold tracking-[0.08em] text-stone-500">{SITE_CONFIG.institutionName}</p>
          <p className="mt-3 inline-flex rounded-full bg-peach px-4 py-2 text-lg font-bold text-coral">
            {SITE_CONFIG.exportTitle}
          </p>
          <h2 className="mt-4 text-4xl font-black text-ink">{resident.full_name}</h2>
          <p className="mt-3 text-xl text-stone-600">
            {formatMonthLabel(monthKey)}
            {" \uff5c "}
            {`\u623f\u865f ${resident.room_no || TEXT.roomFallback}`}
          </p>
        </div>

        <div className="rounded-[28px] bg-white p-5 text-center shadow-soft">
          <p className="text-lg text-stone-500">{TEXT.reviewStatus}</p>
          <p className="mt-2 text-2xl font-black text-coral">{REVIEW_LABELS[summary?.review_status ?? "pending"]}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-3 md:grid-cols-7">
        {calendar.map((day) => {
          const tooltip = day.family_note || day.original_note || day.note || "";

          return (
            <div
              key={day.date}
              className="rounded-[24px] bg-white p-4 text-center shadow-soft"
              title={tooltip || undefined}
            >
              <p className="text-base font-semibold text-stone-500">{formatDateLabel(day.date)}</p>
              <p className="mt-2 text-4xl">{STATUS_FACE[day.status]}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-[28px] bg-white p-6 shadow-soft">
        <p className="text-xl font-black text-ink">{TEXT.monthlyAbnormal}</p>
        {abnormalDays.length === 0 ? (
          <p className="mt-4 text-lg leading-8 text-stone-700">{TEXT.noAbnormal}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {abnormalDays.map((day) => (
              <div key={day.date} className="rounded-2xl bg-orange-50 px-4 py-3">
                <p className="text-lg font-bold text-ink">
                  {formatDateLabel(day.date)} {STATUS_FACE[day.status]} {statusText(day.status)}
                </p>
                <p className="mt-1 text-base leading-7 text-stone-700">
                  {day.family_note || day.original_note || day.note || TEXT.noNote}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 space-y-5">
        {summary?.nurse_summary ? (
          <div className="rounded-[28px] bg-white p-6 shadow-soft">
            <p className="text-xl font-black text-ink">{TEXT.nurseSummary}</p>
            <p className="mt-4 whitespace-pre-line text-lg leading-8 text-stone-700">{summary.nurse_summary}</p>
          </div>
        ) : null}

        {commonNote ? (
          <div className="rounded-[28px] bg-white p-6 shadow-soft">
            <p className="text-xl font-black text-ink">{TEXT.commonNote}</p>
            <p className="mt-4 whitespace-pre-line text-lg leading-8 text-stone-700">{commonNote}</p>
          </div>
        ) : null}

        {familyMessage ? (
          <div className="rounded-[28px] bg-white p-6 shadow-soft">
            <p className="text-xl font-black text-ink">{TEXT.familyMessage}</p>
            <p className="mt-4 whitespace-pre-line text-lg leading-8 text-stone-700">{familyMessage}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PreviewCard({
  resident,
  monthKey,
  calendar,
  summary,
  commonNote,
  allowExport
}: PreviewCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!cardRef.current) return;
    setExporting(true);

    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#fffaf2"
      });
      downloadDataUrl(dataUrl, `${resident.full_name}_${monthKey.replace("-", "")}_${SITE_CONFIG.exportTitle}.png`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div ref={cardRef}>
        <HealthFaceCard
          resident={resident}
          monthKey={monthKey}
          calendar={calendar}
          summary={summary}
          commonNote={commonNote}
        />
      </div>

      {allowExport ? (
        <div className="flex justify-end">
          <button className="button-primary gap-2" type="button" onClick={() => void handleExport()} disabled={exporting}>
            <Download className="h-5 w-5" />
            {exporting ? TEXT.exporting : TEXT.exportPng}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function statusText(status: DailyStatusType) {
  return STATUS_LABELS[status];
}
