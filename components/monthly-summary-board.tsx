"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { MessageSquareMore, NotebookPen, Save } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { REVIEW_LABELS, ROLE_LABELS } from "@/lib/constants";
import { formatMonthLabel, safeFetchJson } from "@/lib/utils";
import type { MonthlyCommonNote, MonthlySummary, Resident, UserRole } from "@/lib/types";

type Props = {
  initialResidents: Resident[];
  initialMonthKey: string;
  initialSummaries: MonthlySummary[];
  initialCommonNote: MonthlyCommonNote | null;
  role: UserRole;
};

type DraftMap = Record<
  string,
  {
    nurse_summary: string;
    monthly_individual_note: string;
  }
>;

export function MonthlySummaryBoard({
  initialResidents,
  initialMonthKey,
  initialSummaries,
  initialCommonNote,
  role
}: Props) {
  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [summaries, setSummaries] = useState(initialSummaries);
  const [commonNote, setCommonNote] = useState(initialCommonNote?.monthly_common_note ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [drafts, setDrafts] = useState<DraftMap>(() => buildDrafts(initialResidents, initialSummaries, initialMonthKey));

  const canEditNurse = role === "nurse" || role === "supervisor";
  const canEditSocial = role === "social_worker" || role === "supervisor";

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
      .map(([room, residents]) => ({
        room,
        residents: [...residents].sort((a, b) => a.full_name.localeCompare(b.full_name, "zh-Hant"))
      }));
  }, [initialResidents]);

  const visibleGroup =
    roomGroups.find((group) => group.room === selectedRoom) ??
    roomGroups[0] ??
    { room: "", residents: [] as Resident[] };

  useEffect(() => {
    if (!selectedRoom && roomGroups.length > 0) {
      setSelectedRoom(roomGroups[0].room);
    }
  }, [roomGroups, selectedRoom]);

  async function loadMonth(nextMonthKey: string) {
    setMonthKey(nextMonthKey);
    setMessage("");
    setError("");

    try {
      const payload = await safeFetchJson<{ summaries: MonthlySummary[]; common_note: MonthlyCommonNote | null }>(
        `/api/monthly-summary?month=${nextMonthKey}`
      );
      setSummaries(payload.summaries);
      setCommonNote(payload.common_note?.monthly_common_note ?? "");
      setDrafts(buildDrafts(initialResidents, payload.summaries, nextMonthKey));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "讀取月總結失敗。");
    }
  }

  async function saveSummary(residentId: string) {
    const draft = drafts[residentId] ?? { nurse_summary: "", monthly_individual_note: "" };
    setSavingKey(residentId);
    setMessage("");
    setError("");

    try {
      await safeFetchJson("/api/monthly-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resident_id: residentId,
          month_key: monthKey,
          nurse_summary: draft.nurse_summary.trim() || null,
          monthly_individual_note: draft.monthly_individual_note.trim() || null
        })
      });

      await loadMonth(monthKey);
      setMessage("個別月總結已儲存。");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "儲存個別月總結失敗。");
    } finally {
      setSavingKey("");
    }
  }

  async function saveCommonNote() {
    setSavingKey("common");
    setMessage("");
    setError("");

    try {
      await safeFetchJson("/api/monthly-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "common",
          month_key: monthKey,
          monthly_common_note: commonNote.trim() || null
        })
      });

      await loadMonth(monthKey);
      setMessage("社工本月統一通知已儲存。");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "儲存共用訊息失敗。");
    } finally {
      setSavingKey("");
    }
  }

  return (
    <div className="space-y-6">
      <section className="card p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-3xl bg-peach p-4 text-coral">
              <NotebookPen className="h-8 w-8" />
            </div>
            <SectionHeader
              title="月總結"
              description={`${formatMonthLabel(monthKey)} 的護理與社工內容。${ROLE_LABELS[role]}可編輯自己負責的欄位。`}
            />
          </div>

          <div className="w-full max-w-[220px]">
            <label className="mb-2 block text-base font-bold text-ink">月份</label>
            <input
              type="month"
              className="field"
              value={monthKey}
              max={format(new Date(), "yyyy-MM")}
              onChange={(event) => void loadMonth(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap gap-3">
          {roomGroups.map((group) => {
            const active = group.room === visibleGroup.room;
            return (
              <button
                key={group.room}
                type="button"
                className={`rounded-2xl px-5 py-3 text-lg font-bold transition ${
                  active ? "bg-coral text-white shadow-soft" : "bg-orange-50 text-ink hover:bg-peach"
                }`}
                onClick={() => setSelectedRoom(group.room)}
              >
                房號 {group.room}
              </button>
            );
          })}
        </div>
      </section>

      {message ? <p className="text-lg font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-lg font-semibold text-red-700">{error}</p> : null}

      <section className="card p-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-orange-50 p-3 text-coral">
            <MessageSquareMore className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-ink">社工：本月統一通知（給所有家屬）</h2>
            <p className="mt-1 text-sm text-stone-600">適合填寫會議通知、活動說明、共同提醒等內容。</p>
          </div>
        </div>

        <textarea
          className="field min-h-[140px]"
          value={commonNote}
          onChange={(event) => setCommonNote(event.target.value)}
          placeholder="例如：本月家屬座談會將於月底舉行，詳細時間會另行通知。"
          disabled={!canEditSocial}
        />

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl bg-peach px-4 py-3 text-base font-bold text-ink transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void saveCommonNote()}
            disabled={!canEditSocial || savingKey === "common"}
          >
            <Save className="h-4 w-4" />
            儲存統一通知
          </button>
        </div>
      </section>

      <section className="card p-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-black text-ink">房號 {visibleGroup.room}</h2>
            <p className="mt-2 text-lg text-stone-600">
              {formatMonthLabel(monthKey)} ｜ 共 {visibleGroup.residents.length} 位院民
            </p>
          </div>
          <div className="rounded-[24px] bg-orange-50 px-5 py-4 text-lg font-semibold text-stone-700">
            護理與社工內容分開儲存，不會互相覆蓋。
          </div>
        </div>

        {visibleGroup.residents.length === 0 ? (
          <div className="rounded-[24px] bg-orange-50 px-5 py-4 text-lg text-stone-600">這個房號目前沒有啟用中的院民。</div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleGroup.residents.map((resident) => {
              const summary = summaryMap.get(`${resident.id}:${monthKey}`);
              const draft = drafts[resident.id] ?? { nurse_summary: "", monthly_individual_note: "" };
              const combinedFamilyMessage = [commonNote.trim(), draft.monthly_individual_note.trim()].filter(Boolean).join("\n");

              return (
                <article
                  key={`${resident.id}:${monthKey}`}
                  className="rounded-[28px] border-2 border-orange-100 bg-white p-5 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-black text-ink">{resident.full_name}</h3>
                      <p className="mt-2 text-base text-stone-500">房號 {resident.room_no || "未分房"}</p>
                    </div>
                    <div className="rounded-full bg-orange-50 px-3 py-2 text-sm font-black text-coral">
                      {REVIEW_LABELS[summary?.review_status ?? "pending"]}
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="mb-2 block text-base font-bold text-ink">護理師：本月整體狀況</label>
                      <textarea
                        className="field min-h-[120px]"
                        value={draft.nurse_summary}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [resident.id]: {
                              ...(prev[resident.id] ?? { nurse_summary: "", monthly_individual_note: "" }),
                              nurse_summary: event.target.value
                            }
                          }))
                        }
                        placeholder="請填寫本月照護觀察、健康狀況與需要留意事項。"
                        disabled={!canEditNurse}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-base font-bold text-ink">社工補充（個別家屬）</label>
                      <textarea
                        className="field min-h-[120px]"
                        value={draft.monthly_individual_note}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [resident.id]: {
                              ...(prev[resident.id] ?? { nurse_summary: "", monthly_individual_note: "" }),
                              monthly_individual_note: event.target.value
                            }
                          }))
                        }
                        placeholder="若需針對個別家屬補充說明，可在這裡填寫。"
                        disabled={!canEditSocial}
                      />
                    </div>

                    <div className="rounded-2xl bg-orange-50 px-4 py-4">
                      <p className="text-sm font-bold text-ink">家屬將看到的內容</p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-stone-700">
                        {combinedFamilyMessage || "尚未填寫社工訊息"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm text-stone-500">儲存時只更新這位院民的欄位內容</p>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-2xl bg-peach px-4 py-3 text-base font-bold text-ink transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => void saveSummary(resident.id)}
                      disabled={savingKey === resident.id || (!canEditNurse && !canEditSocial)}
                    >
                      <Save className="h-4 w-4" />
                      儲存
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function buildDrafts(residents: Resident[], summaries: MonthlySummary[], monthKey: string): DraftMap {
  const summaryMap = new Map(summaries.map((item) => [`${item.resident_id}:${item.month_key}`, item]));

  return Object.fromEntries(
    residents.map((resident) => {
      const summary = summaryMap.get(`${resident.id}:${monthKey}`);
      return [
        resident.id,
        {
          nurse_summary: summary?.nurse_summary ?? "",
          monthly_individual_note: summary?.monthly_individual_note ?? summary?.social_message ?? ""
        }
      ];
    })
  );
}

function normalizeRoom(room: string | null) {
  return room?.trim() || "未分房";
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
