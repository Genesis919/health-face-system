"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { toPng } from "html-to-image";
import { CheckCheck, Download, FolderArchive, ShieldCheck } from "lucide-react";
import { HealthFaceCard, PreviewCard } from "@/components/preview-card";
import { SectionHeader } from "@/components/section-header";
import { SITE_CONFIG } from "@/lib/site";
import { buildMonthlyCalendar, downloadBlob, formatMonthLabel, safeFetchJson } from "@/lib/utils";
import type { DailyStatus, MonthlySummary, Resident, UserRole } from "@/lib/types";

type Props = {
  initialResidents: Resident[];
  initialMonthKey: string;
  initialSummaries: MonthlySummary[];
  initialDailyStatuses: DailyStatus[];
  initialCommonNote: string | null;
  role: UserRole;
};

type RoomGroup = {
  room: string;
  residents: Resident[];
  total: number;
  approvedCount: number;
  pendingCount: number;
  completed: boolean;
};

const TEXT = {
  title: "\u4e3b\u7ba1\u5be9\u6838\u8207\u532f\u51fa",
  description:
    "\u4e3b\u7ba1\u53ef\u4f9d\u623f\u865f\u6aa2\u8996\u9662\u6c11\u5065\u5eb7\u81c9\u8b5c\uff0c\u5b8c\u6210\u55ae\u7b46\u6216\u6279\u6b21\u5be9\u6838\uff0c\u4e26\u5728\u5be9\u6838\u5b8c\u6210\u5f8c\u532f\u51fa PNG \u6216\u672c\u623f ZIP\u3002",
  allRooms: "\u5168\u90e8\u623f\u865f",
  roomLabel: "\u623f\u865f",
  allApprove: "\u5168\u9662\u4e00\u9375\u5168\u90e8\u5be9\u6838",
  futureExport: "\u532f\u51fa\u5168\u9662 ZIP",
  futureExportTitle: "\u4fdd\u7559\u672a\u4f86\u64f4\u5145",
  successRoomZip: "\u5df2\u5b8c\u6210 ZIP \u532f\u51fa\u3002",
  missingExportNode: "\u627e\u4e0d\u5230\u532f\u51fa\u5167\u5bb9\u3002",
  roomAlreadyDone: "\u5df2\u5168\u90e8\u5be9\u6838\u5b8c\u6210\u3002",
  institutionWideDone: "\u672c\u6708\u5168\u9662\u7686\u5df2\u5be9\u6838\u5b8c\u6210\u3002",
  confirmBulkPrefix: "\u78ba\u5b9a\u8981\u5c07",
  confirmBulkSuffix: "\u6240\u6709\u5f85\u5be9\u6838\u9662\u6c11\u4e00\u6b21\u8a2d\u70ba\u5df2\u901a\u904e\u55ce\uff1f",
  updatedSingle: "\u5df2\u66f4\u65b0\u5be9\u6838\u72c0\u614b\u3002",
  failedUpdate: "\u66f4\u65b0\u5be9\u6838\u72c0\u614b\u5931\u6557\u3002",
  failedBulk: "\u6279\u6b21\u5be9\u6838\u5931\u6557\u3002",
  roomZipBlocked: "\u5c1a\u672a\u5168\u90e8\u5be9\u6838\u5b8c\u6210\uff0c\u7121\u6cd5\u532f\u51fa\u672c\u623f ZIP\u3002",
  failedZip: "\u532f\u51fa\u672c\u623f ZIP \u5931\u6557\u3002",
  listTitle: "\u4f9d\u623f\u865f\u5be9\u6838\u6e05\u55ae",
  listHint: "\u4f9d\u623f\u865f\u6392\u5e8f\uff0c\u623f\u5167\u4f9d\u59d3\u540d\u6392\u5e8f",
  noData: "\u5c1a\u7121\u8cc7\u6599",
  roomApprove: "\u672c\u623f\u4e00\u9375\u5168\u90e8\u5be9\u6838",
  roomExport: "\u532f\u51fa\u672c\u623f\u5168\u90e8 PNG\uff08ZIP\uff09",
  approved: "\u5df2\u901a\u904e",
  pending: "\u5f85\u5be9\u6838",
  completed: "\u5df2\u5b8c\u6210",
  incomplete: "\u672a\u5b8c\u6210",
  roomNotice: "\u672c\u6708\u7d71\u4e00\u901a\u77e5\uff08\u7d66\u6240\u6709\u5bb6\u5c6c\uff09",
  actionTitle: "\u5be9\u6838\u64cd\u4f5c",
  actionHintPrefix: "\u53ef\u91dd\u5c0d",
  actionHintSuffix:
    "\u586b\u5beb\u5be9\u6838\u5099\u8a3b\uff0c\u4e26\u66f4\u65b0\u70ba\u5f85\u5be9\u6838\uff0c\u5df2\u901a\u904e\u6216\u9000\u56de\u4fee\u6b63\u3002",
  reviewPlaceholder: "\u53ef\u88dc\u5145\u5be9\u6838\u8aaa\u660e\uff0c\u63d0\u9192\u4e8b\u9805\u6216\u9000\u56de\u539f\u56e0\u3002",
  approveSingle: "\u5be9\u6838\u901a\u904e",
  rejectSingle: "\u9000\u56de\u4fee\u6b63",
  pendingSingle: "\u8a2d\u70ba\u5f85\u5be9\u6838",
  monthSummarySeparator: " \uff5c ",
  roomFallback: "\u672a\u5206\u914d"
} as const;

export function ReviewBoard({
  initialResidents,
  initialMonthKey,
  initialSummaries,
  initialDailyStatuses,
  initialCommonNote,
  role
}: Props) {
  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [roomFilter, setRoomFilter] = useState("all");
  const [summaries, setSummaries] = useState(initialSummaries);
  const [dailyStatuses, setDailyStatuses] = useState(initialDailyStatuses);
  const [commonNote, setCommonNote] = useState(initialCommonNote ?? "");
  const [selectedResidentId, setSelectedResidentId] = useState(initialResidents[0]?.id ?? "");
  const [reviewNote, setReviewNote] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const [roomExportTarget, setRoomExportTarget] = useState<RoomGroup | null>(null);
  const exportNodeMapRef = useRef<Record<string, HTMLDivElement | null>>({});

  const summaryMap = useMemo(
    () => new Map(summaries.map((item) => [`${item.resident_id}:${item.month_key}`, item])),
    [summaries]
  );

  const roomGroups = useMemo(() => {
    const groups = new Map<string, Resident[]>();

    for (const resident of initialResidents) {
      const roomKey = normalizeRoom(resident.room_no);
      const list = groups.get(roomKey) ?? [];
      list.push(resident);
      groups.set(roomKey, list);
    }

    return Array.from(groups.entries())
      .sort(([roomA], [roomB]) => compareRoom(roomA, roomB))
      .map(([room, residents]) => {
        const sortedResidents = [...residents].sort((a, b) => a.full_name.localeCompare(b.full_name, "zh-Hant"));
        const approvedCount = sortedResidents.filter((resident) => {
          const summary = summaryMap.get(`${resident.id}:${monthKey}`);
          return summary?.review_status === "approved";
        }).length;

        return {
          room,
          residents: sortedResidents,
          total: sortedResidents.length,
          approvedCount,
          pendingCount: Math.max(sortedResidents.length - approvedCount, 0),
          completed: approvedCount === sortedResidents.length && sortedResidents.length > 0
        } satisfies RoomGroup;
      });
  }, [initialResidents, monthKey, summaryMap]);

  const roomOptions = useMemo(() => roomGroups.map((group) => group.room), [roomGroups]);
  const visibleRoomGroups = useMemo(
    () => roomGroups.filter((group) => roomFilter === "all" || group.room === roomFilter),
    [roomFilter, roomGroups]
  );
  const visibleResidents = useMemo(() => visibleRoomGroups.flatMap((group) => group.residents), [visibleRoomGroups]);

  useEffect(() => {
    if (visibleResidents.length === 0) {
      setSelectedResidentId("");
      return;
    }

    if (!visibleResidents.some((resident) => resident.id === selectedResidentId)) {
      setSelectedResidentId(visibleResidents[0].id);
    }
  }, [selectedResidentId, visibleResidents]);

  const totalResidents = initialResidents.length;
  const approvedTotal = roomGroups.reduce((sum, group) => sum + group.approvedCount, 0);
  const pendingTotal = Math.max(totalResidents - approvedTotal, 0);

  const selectedResident =
    initialResidents.find((resident) => resident.id === selectedResidentId) ?? visibleResidents[0] ?? null;
  const selectedSummary = selectedResident ? summaryMap.get(`${selectedResident.id}:${monthKey}`) ?? null : null;
  const selectedCalendar = selectedResident
    ? buildMonthlyCalendar(monthKey, dailyStatuses.filter((item) => item.resident_id === selectedResident.id))
    : [];

  useEffect(() => {
    setReviewNote(selectedSummary?.review_note ?? "");
  }, [selectedResidentId, selectedSummary?.review_note]);

  useEffect(() => {
    if (!roomExportTarget) return;

    let cancelled = false;

    async function exportRoomZip() {
      await waitForPaint();
      await waitForPaint();
      if (cancelled) return;

      try {
        const zip = new JSZip();

        for (const resident of roomExportTarget.residents) {
          const node = exportNodeMapRef.current[resident.id];
          if (!node) {
            throw new Error(`${resident.full_name}${TEXT.missingExportNode}`);
          }

          const dataUrl = await toPng(node, {
            cacheBust: true,
            pixelRatio: 2,
            backgroundColor: "#fffaf2"
          });
          const blob = await dataUrlToBlob(dataUrl);
          zip.file(`${resident.full_name}_${monthKey.replace("-", "")}_${SITE_CONFIG.exportTitle}.png`, blob);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        downloadBlob(zipBlob, buildRoomZipFilename(monthKey, roomExportTarget.room));

        if (!cancelled) {
          setMessage(`${TEXT.roomLabel} ${roomExportTarget.room} ${TEXT.successRoomZip}`);
          setErrorMessage("");
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : TEXT.failedZip);
        }
      } finally {
        if (!cancelled) {
          setSavingKey("");
          setRoomExportTarget(null);
        }
      }
    }

    void exportRoomZip();

    return () => {
      cancelled = true;
    };
  }, [roomExportTarget, monthKey, dailyStatuses, commonNote, summaryMap]);

  async function reload(nextMonthKey = monthKey) {
    const [summaryPayload, dailyPayload] = await Promise.all([
      safeFetchJson<{ summaries: MonthlySummary[]; common_note?: { monthly_common_note?: string | null } | null }>(
        `/api/monthly-summary?month=${nextMonthKey}`
      ),
      safeFetchJson<{ statuses: DailyStatus[] }>(`/api/daily-status?month=${nextMonthKey}`)
    ]);

    setSummaries(summaryPayload.summaries);
    setCommonNote(summaryPayload.common_note?.monthly_common_note ?? "");
    setDailyStatuses(dailyPayload.statuses);
  }

  async function updateReview(reviewStatus: "approved" | "rejected" | "pending") {
    if (!selectedResident) return;

    setSavingKey(`single:${selectedResident.id}`);
    setErrorMessage("");

    try {
      await safeFetchJson("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resident_id: selectedResident.id,
          month_key: monthKey,
          review_status: reviewStatus,
          review_note: reviewNote
        })
      });

      await reload();
      setMessage(`${selectedResident.full_name}${TEXT.updatedSingle}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : TEXT.failedUpdate);
    } finally {
      setSavingKey("");
    }
  }

  async function bulkApprove(group: RoomGroup | null) {
    const residentIds = (group ? group.residents : initialResidents)
      .filter((resident) => (summaryMap.get(`${resident.id}:${monthKey}`)?.review_status ?? "pending") !== "approved")
      .map((resident) => resident.id);

    if (residentIds.length === 0) {
      setMessage(group ? `${TEXT.roomLabel} ${group.room} ${TEXT.roomAlreadyDone}` : TEXT.institutionWideDone);
      return;
    }

    const label = group ? `${TEXT.roomLabel} ${group.room}` : "\u672c\u6708\u5168\u9662";
    if (!window.confirm(`${TEXT.confirmBulkPrefix}${label}${TEXT.confirmBulkSuffix}`)) {
      return;
    }

    const actionKey = group ? `room:${group.room}` : "all";
    setSavingKey(actionKey);
    setErrorMessage("");

    try {
      await safeFetchJson("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "bulk",
          resident_ids: residentIds,
          month_key: monthKey,
          review_status: "approved"
        })
      });

      await reload();
      setMessage(`${label}${TEXT.roomAlreadyDone}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : TEXT.failedBulk);
    } finally {
      setSavingKey("");
    }
  }

  function handleRoomExport(group: RoomGroup) {
    if (!group.completed) {
      setErrorMessage(`${TEXT.roomLabel} ${group.room} ${TEXT.roomZipBlocked}`);
      return;
    }

    setSavingKey(`export:${group.room}`);
    setErrorMessage("");
    setMessage("");
    setRoomExportTarget(group);
  }

  return (
    <div className="space-y-6">
      <section className="card p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-3xl bg-peach p-4 text-coral">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <SectionHeader title={TEXT.title} description={TEXT.description} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap">
            <input
              type="month"
              className="field min-w-[180px]"
              value={monthKey}
              onChange={async (event) => {
                const nextMonthKey = event.target.value;
                setMonthKey(nextMonthKey);
                setMessage("");
                setErrorMessage("");
                await reload(nextMonthKey);
              }}
            />

            <select className="field min-w-[180px]" value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)}>
              <option value="all">{TEXT.allRooms}</option>
              {roomOptions.map((room) => (
                <option key={room} value={room}>
                  {`${TEXT.roomLabel} ${room}`}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="button-primary gap-2"
              disabled={role !== "supervisor" || pendingTotal === 0 || savingKey === "all"}
              onClick={() => void bulkApprove(null)}
            >
              <CheckCheck className="h-5 w-5" />
              {TEXT.allApprove}
            </button>

            <button type="button" className="button-secondary gap-2 opacity-70" disabled title={TEXT.futureExportTitle}>
              <FolderArchive className="h-5 w-5" />
              {TEXT.futureExport}
            </button>
          </div>
        </div>
      </section>

      {message ? <p className="text-lg font-semibold text-emerald-700">{message}</p> : null}
      {errorMessage ? <p className="text-lg font-semibold text-rose-600">{errorMessage}</p> : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="card p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-ink">{TEXT.listTitle}</h2>
              <p className="mt-2 text-sm text-stone-600">
                {formatMonthLabel(monthKey)}
                {TEXT.monthSummarySeparator}
                {`\u5168\u9662 ${totalResidents} \u4f4d`}
                {TEXT.monthSummarySeparator}
                {`\u5df2\u901a\u904e ${approvedTotal} \u4f4d`}
                {TEXT.monthSummarySeparator}
                {`\u5f85\u5be9\u6838 ${pendingTotal} \u4f4d`}
              </p>
            </div>
            <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-semibold text-stone-700">{TEXT.listHint}</div>
          </div>

          <div className="mt-5 space-y-4">
            {visibleRoomGroups.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-orange-200 bg-orange-50/60 px-5 py-8 text-center text-stone-600">
                {TEXT.noData}
              </div>
            ) : (
              visibleRoomGroups.map((group) => (
                <section
                  key={group.room}
                  className={`rounded-[24px] border-2 p-4 ${
                    group.completed ? "border-emerald-300 bg-emerald-50/70" : "border-orange-200 bg-orange-50/70"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-black text-ink">{`${TEXT.roomLabel} ${group.room}`}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            group.completed ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {group.completed ? TEXT.completed : TEXT.incomplete}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-stone-600">
                        {`\u672c\u623f ${group.total} \u4f4d \uff5c \u5df2\u5be9\u6838 ${group.approvedCount} \u4f4d \uff5c \u672a\u5be9\u6838 ${group.pendingCount} \u4f4d`}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-2xl bg-peach px-4 py-3 text-sm font-bold text-ink transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={role !== "supervisor" || group.pendingCount === 0 || savingKey === `room:${group.room}`}
                        onClick={() => void bulkApprove(group)}
                      >
                        <CheckCheck className="h-4 w-4" />
                        {TEXT.roomApprove}
                      </button>

                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!group.completed || savingKey === `export:${group.room}`}
                        onClick={() => handleRoomExport(group)}
                      >
                        <Download className="h-4 w-4" />
                        {TEXT.roomExport}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {group.residents.map((resident) => {
                      const summary = summaryMap.get(`${resident.id}:${monthKey}`);
                      const active = resident.id === selectedResidentId;
                      const reviewed = (summary?.review_status ?? "pending") === "approved";

                      return (
                        <button
                          type="button"
                          key={resident.id}
                          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                            active
                              ? "border-coral bg-peach"
                              : reviewed
                                ? "border-emerald-200 bg-white hover:bg-emerald-50/60"
                                : "border-orange-100 bg-white hover:bg-orange-50"
                          }`}
                          onClick={() => {
                            setSelectedResidentId(resident.id);
                            setMessage("");
                            setErrorMessage("");
                          }}
                        >
                          <span className="text-lg font-bold text-ink">{resident.full_name}</span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              reviewed ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {reviewed ? TEXT.approved : TEXT.pending}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          {commonNote ? (
            <section className="card p-6">
              <h2 className="text-2xl font-black text-ink">{TEXT.roomNotice}</h2>
              <p className="mt-4 whitespace-pre-line text-lg leading-8 text-stone-700">{commonNote}</p>
            </section>
          ) : null}

          {selectedResident ? (
            <>
              <PreviewCard
                resident={selectedResident}
                monthKey={monthKey}
                calendar={selectedCalendar}
                summary={selectedSummary}
                commonNote={commonNote}
                allowExport={role === "supervisor" && selectedSummary?.review_status === "approved"}
              />

              <div className="card p-7">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-ink">{TEXT.actionTitle}</h2>
                    <p className="mt-2 text-sm text-stone-600">
                      {TEXT.actionHintPrefix}
                      {selectedResident.full_name}
                      {TEXT.actionHintSuffix}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-4 py-2 text-sm font-bold ${
                      (selectedSummary?.review_status ?? "pending") === "approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {(selectedSummary?.review_status ?? "pending") === "approved" ? TEXT.approved : TEXT.pending}
                  </span>
                </div>

                <textarea
                  id="review-note"
                  className="field mt-5 min-h-[120px]"
                  placeholder={TEXT.reviewPlaceholder}
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  disabled={role !== "supervisor"}
                />

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="button-primary"
                    disabled={role !== "supervisor" || savingKey === `single:${selectedResident.id}`}
                    onClick={() => void updateReview("approved")}
                  >
                    {TEXT.approveSingle}
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    disabled={role !== "supervisor" || savingKey === `single:${selectedResident.id}`}
                    onClick={() => void updateReview("rejected")}
                  >
                    {TEXT.rejectSingle}
                  </button>
                  <button
                    type="button"
                    className="button-ghost"
                    disabled={role !== "supervisor" || savingKey === `single:${selectedResident.id}`}
                    onClick={() => void updateReview("pending")}
                  >
                    {TEXT.pendingSingle}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="card p-8 text-center text-stone-600">{TEXT.noData}</div>
          )}
        </div>
      </section>

      {roomExportTarget ? (
        <div className="pointer-events-none fixed -left-[9999px] top-0 z-[-1] opacity-0">
          {roomExportTarget.residents.map((resident) => (
            <div
              key={resident.id}
              ref={(node) => {
                exportNodeMapRef.current[resident.id] = node;
              }}
              className="mb-8 w-[1200px]"
            >
              <HealthFaceCard
                resident={resident}
                monthKey={monthKey}
                calendar={buildMonthlyCalendar(
                  monthKey,
                  dailyStatuses.filter((item) => item.resident_id === resident.id)
                )}
                summary={summaryMap.get(`${resident.id}:${monthKey}`) ?? null}
                commonNote={commonNote}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function normalizeRoom(room: string | null) {
  return room?.trim() || TEXT.roomFallback;
}

function compareRoom(roomA: string, roomB: string) {
  const numA = Number(roomA);
  const numB = Number(roomB);
  const isNumA = !Number.isNaN(numA);
  const isNumB = !Number.isNaN(numB);

  if (isNumA && isNumB) return numA - numB;
  if (isNumA) return -1;
  if (isNumB) return 1;
  return roomA.localeCompare(roomB, "zh-Hant");
}

function buildRoomZipFilename(monthKey: string, room: string) {
  const [year, month] = monthKey.split("-");
  return `${SITE_CONFIG.institutionName}_${year}\u5e74${month}\u6708_\u623f\u865f${room}_${SITE_CONFIG.exportTitle}.zip`;
}

async function waitForPaint() {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.blob();
}
