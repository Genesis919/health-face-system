"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CalendarHeart,
  CheckCircle2,
  Clock3,
  Save,
  Users
} from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { STATUS_FACE, STATUS_LABELS } from "@/lib/constants";
import { safeFetchJson } from "@/lib/utils";
import type { DailyStatus, DailyStatusType, Resident, UserRole } from "@/lib/types";

type Props = {
  currentDate: string;
  initialResidents: Resident[];
  initialStatuses: DailyStatus[];
  initialMonthStatuses: DailyStatus[];
  role: UserRole;
};

type ResidentDraft = {
  status_type: DailyStatusType;
  original_note: string;
  family_note: string;
};

type RoomSummary = {
  room: string;
  total: number;
  completed: number;
  remaining: number;
  dirty: boolean;
  counts: Record<DailyStatusType, number>;
};

const EMPTY_DRAFT: ResidentDraft = {
  status_type: "normal",
  original_note: "",
  family_note: ""
};

export function DailyStatusBoard({
  currentDate,
  initialResidents,
  initialStatuses,
  initialMonthStatuses,
  role
}: Props) {
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [statuses, setStatuses] = useState(initialStatuses);
  const [monthStatuses, setMonthStatuses] = useState(initialMonthStatuses);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const [transformingResidentId, setTransformingResidentId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [drafts, setDrafts] = useState<Record<string, ResidentDraft>>(() =>
    buildDrafts(initialResidents, initialStatuses)
  );

  const canEdit = role === "nurse" || role === "supervisor";
  const todayMonthKey = currentDate.slice(0, 7);
  const selectedMonthKey = selectedDate.slice(0, 7);
  const isBackfillMode = selectedDate !== currentDate;

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

  const dbStatusMap = useMemo(
    () =>
      new Map(
        statuses.map((item) => [
          item.resident_id,
          {
            status_type: item.status_type,
            original_note: item.original_note ?? item.note ?? "",
            family_note: item.family_note ?? ""
          }
        ])
      ),
    [statuses]
  );

  const roomSummaries = useMemo<RoomSummary[]>(
    () =>
      roomGroups.map((group) => {
        const counts: Record<DailyStatusType, number> = {
          normal: 0,
          unwell: 0,
          hospital: 0
        };

        let completed = 0;

        for (const resident of group.residents) {
          const saved = dbStatusMap.get(resident.id);
          if (!saved) continue;
          completed += 1;
          counts[saved.status_type] += 1;
        }

        return {
          room: group.room,
          total: group.residents.length,
          completed,
          remaining: Math.max(group.residents.length - completed, 0),
          dirty: group.residents.some((resident) => isDirty(resident.id, drafts, dbStatusMap)),
          counts
        };
      }),
    [dbStatusMap, drafts, roomGroups]
  );

  const totalCount = initialResidents.length;
  const recordedCount = initialResidents.filter((resident) => dbStatusMap.has(resident.id)).length;
  const unrecordedCount = Math.max(totalCount - recordedCount, 0);
  const hasAnyDirty = initialResidents.some((resident) => isDirty(resident.id, drafts, dbStatusMap));
  const roomDirty = visibleGroup.residents.some((resident) => isDirty(resident.id, drafts, dbStatusMap));

  const incompleteDates = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const item of monthStatuses) {
      grouped.set(item.record_date, (grouped.get(item.record_date) ?? 0) + 1);
    }

    const endDate = selectedMonthKey === todayMonthKey ? currentDate : endOfMonth(selectedMonthKey);
    const dates = getDateRange(`${selectedMonthKey}-01`, endDate);

    return dates
      .map((date) => ({
        date,
        recorded: grouped.get(date) ?? 0,
        remaining: Math.max(totalCount - (grouped.get(date) ?? 0), 0)
      }))
      .filter((item) => item.remaining > 0);
  }, [currentDate, monthStatuses, selectedMonthKey, todayMonthKey, totalCount]);

  useEffect(() => {
    if (!selectedRoom && roomGroups.length > 0) {
      setSelectedRoom(roomGroups[0].room);
    }
  }, [roomGroups, selectedRoom]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasAnyDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasAnyDirty]);

  async function refreshForDate(nextDate: string) {
    const monthKey = nextDate.slice(0, 7);
    const [datePayload, monthPayload] = await Promise.all([
      safeFetchJson<{ statuses: DailyStatus[] }>(`/api/daily-status?date=${nextDate}`),
      safeFetchJson<{ statuses: DailyStatus[] }>(`/api/daily-status?month=${monthKey}`)
    ]);

    setStatuses(datePayload.statuses);
    setMonthStatuses(monthPayload.statuses);
    setDrafts(buildDrafts(initialResidents, datePayload.statuses));
  }

  async function switchDate(nextDate: string) {
    if (nextDate === selectedDate) return;

    if (hasAnyDirty && !window.confirm("目前有尚未儲存的變更，確定要切換日期嗎？")) {
      return;
    }

    setSavingKey("date");
    setMessage("");
    setError("");

    try {
      await refreshForDate(nextDate);
      setSelectedDate(nextDate);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "切換日期失敗。");
    } finally {
      setSavingKey("");
    }
  }

  async function handleRoomSave() {
    setSavingKey("room-save");
    setMessage("");
    setError("");

    try {
      await safeFetchJson("/api/daily-status/bulk-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record_date: selectedDate,
          items: visibleGroup.residents.map((resident) => ({
            resident_id: resident.id,
            status_type: drafts[resident.id]?.status_type ?? "normal",
            original_note: drafts[resident.id]?.original_note ?? "",
            family_note: drafts[resident.id]?.family_note ?? ""
          }))
        })
      });

      await refreshForDate(selectedDate);
      setMessage(`房號 ${visibleGroup.room} 已儲存 ${selectedDate} 的紀錄。`);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "整房儲存失敗。");
    } finally {
      setSavingKey("");
    }
  }

  async function markAllNormal(scope: "hospital" | "room") {
    const roomNo = scope === "room" ? visibleGroup.room : null;
    setSavingKey(scope);
    setMessage("");
    setError("");

    try {
      await safeFetchJson("/api/daily-status/bulk-normal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record_date: selectedDate,
          room_no: roomNo && roomNo !== "未分房" ? roomNo : null
        })
      });

      await refreshForDate(selectedDate);
      setMessage(
        scope === "room"
          ? `房號 ${visibleGroup.room} 已重設為 ${selectedDate} 全部正常。`
          : `${selectedDate} 全院已重設為全部正常。`
      );
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "重設正常失敗。");
    } finally {
      setSavingKey("");
    }
  }

  function updateDraft(residentId: string, patch: Partial<ResidentDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [residentId]: {
        ...(prev[residentId] ?? EMPTY_DRAFT),
        ...patch
      }
    }));
  }

  async function handleGenerateFamilyNote(residentId: string) {
    const draft = drafts[residentId] ?? EMPTY_DRAFT;
    if (!draft.original_note.trim()) {
      setError("請先輸入護理師原始備註。");
      return;
    }

    setTransformingResidentId(residentId);
    setMessage("");
    setError("");

    try {
      const payload = await safeFetchJson<{ success: boolean; family_note: string }>("/api/daily-status/family-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ original_note: draft.original_note })
      });

      updateDraft(residentId, { family_note: payload.family_note });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "轉換家屬說明失敗。");
    } finally {
      setTransformingResidentId(null);
    }
  }

  function handleRoomChange(nextRoom: string) {
    if (roomDirty && !window.confirm("此房尚有未儲存的變更，確定要切換房號嗎？")) {
      return;
    }

    setSelectedRoom(nextRoom);
  }

  return (
    <div className="space-y-4">
      <section className="card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-peach p-3 text-coral">
              <CalendarHeart className="h-6 w-6" />
            </div>
            <SectionHeader
              title="每日異常"
              description={`${selectedDate} 的院民健康紀錄，完成度以該日期資料庫實際紀錄為準。`}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <QuickDateButton
              active={selectedDate === currentDate}
              disabled={savingKey === "date"}
              onClick={() => void switchDate(currentDate)}
            >
              今天
            </QuickDateButton>
            <QuickDateButton
              active={selectedDate === shiftDate(currentDate, -1)}
              disabled={savingKey === "date"}
              onClick={() => void switchDate(shiftDate(currentDate, -1))}
            >
              昨天
            </QuickDateButton>
            <QuickDateButton
              active={selectedDate === shiftDate(currentDate, -2)}
              disabled={savingKey === "date"}
              onClick={() => void switchDate(shiftDate(currentDate, -2))}
            >
              前天
            </QuickDateButton>
            <label className="inline-flex h-11 items-center gap-2 rounded-full border border-orange-200 bg-white px-4 text-sm font-semibold text-stone-700">
              <CalendarDays className="h-4 w-4 text-coral" />
              自訂日期
              <input
                type="date"
                className="bg-transparent text-sm outline-none"
                value={selectedDate}
                max={currentDate}
                onChange={(event) => void switchDate(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="button-ghost h-11 gap-2 px-4 text-sm"
              disabled={!canEdit || savingKey === "hospital"}
              onClick={() => void markAllNormal("hospital")}
            >
              <Building2 className="h-4 w-4" />
              今日全院全部正常
            </button>
          </div>
        </div>
      </section>

      {isBackfillMode ? (
        <section className="card border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center gap-2 text-orange-900">
            <Clock3 className="h-5 w-5" />
            <p className="text-sm font-bold">目前為補記模式，你正在編輯 {selectedDate} 的紀錄</p>
          </div>
        </section>
      ) : (
        <section className="card border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-emerald-900">
            <CheckCircle2 className="h-5 w-5" />
            <p className="text-sm font-bold">目前為今日填寫模式，你正在編輯今天 {selectedDate} 的紀錄</p>
          </div>
        </section>
      )}

      <section className="grid gap-3 md:grid-cols-3">
        <CompactStatCard title="全院總數" value={String(totalCount)} icon={<Users className="h-5 w-5" />} tone="orange" />
        <CompactStatCard
          title="已記錄人數"
          value={String(recordedCount)}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="green"
        />
        <CompactStatCard
          title="未記錄人數"
          value={String(unrecordedCount)}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="amber"
        />
      </section>

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-ink">本月未完成日期</h2>
            <p className="mt-1 text-xs text-stone-600">快速找出本月尚未補齊的日期。</p>
          </div>
          <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold text-orange-800">
            {selectedMonthKey}
          </span>
        </div>

        {incompleteDates.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {incompleteDates.map((item) => (
              <button
                key={item.date}
                type="button"
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  item.date === selectedDate
                    ? "bg-coral text-white"
                    : "bg-orange-100 text-orange-900 hover:bg-orange-200"
                }`}
                onClick={() => void switchDate(item.date)}
              >
                {item.date.slice(5)} 尚缺 {item.remaining} 人
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-emerald-700">本月目前沒有未完成日期。</p>
        )}
      </section>

      <section className="card p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-ink">房號總覽</h2>
            <p className="mt-1 text-xs text-stone-600">依 {selectedDate} 的實際紀錄判斷哪些房還沒完成。</p>
          </div>
          {unrecordedCount > 0 ? (
            <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold text-orange-800">
              尚有 {unrecordedCount} 人未記錄
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
              本日已完成
            </span>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
          {roomSummaries.map((summary) => {
            const active = summary.room === visibleGroup.room;
            const complete = summary.completed === summary.total && summary.total > 0;

            return (
              <button
                key={summary.room}
                type="button"
                className={roomCardClassName({ active, complete, dirty: summary.dirty })}
                onClick={() => handleRoomChange(summary.room)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-black">房號 {summary.room}</p>
                    <p className="mt-0.5 text-xs font-semibold text-stone-600">
                      完成 {summary.completed}/{summary.total}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        summary.remaining > 0
                          ? "bg-orange-100 text-orange-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {summary.remaining > 0 ? "未完成" : "已完成"}
                    </span>
                    {summary.dirty ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                        尚未儲存
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px] font-bold">
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-center text-emerald-800">
                    正常 {summary.counts.normal}
                  </span>
                  <span className="rounded-full bg-orange-100 px-2 py-1 text-center text-orange-800">
                    不佳 {summary.counts.unwell}
                  </span>
                  <span className="rounded-full bg-rose-100 px-2 py-1 text-center text-rose-800">
                    住院 {summary.counts.hospital}
                  </span>
                </div>

                {summary.remaining > 0 ? (
                  <p className="mt-2 text-[11px] font-semibold text-red-600">尚有 {summary.remaining} 人未記錄</p>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}

      {roomDirty ? (
        <section className="card border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-bold">此房有尚未儲存的變更</p>
          </div>
          <p className="mt-1 text-sm text-amber-900">切換房號或日期前，請先按「整房儲存」，避免資料遺失。</p>
        </section>
      ) : null}

      <section className="card p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-ink">房號 {visibleGroup.room}</h2>
            <p className="mt-1 text-sm text-stone-600">切換狀態與備註後，按整房儲存即可完成 {selectedDate} 的紀錄。</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="button-primary h-11 gap-2 px-5 text-sm"
              disabled={!canEdit || savingKey === "room-save"}
              onClick={() => void handleRoomSave()}
            >
              <Save className="h-4 w-4" />
              整房儲存
            </button>
            <button
              type="button"
              className="button-secondary h-11 gap-2 px-4 text-sm"
              disabled={!canEdit || savingKey === "room"}
              onClick={() => void markAllNormal("room")}
            >
              <CheckCircle2 className="h-4 w-4" />
              本房全部正常
            </button>
          </div>
        </div>

        {visibleGroup.residents.length === 0 ? (
          <div className="rounded-3xl bg-orange-50 px-4 py-3 text-sm text-stone-600">這個房號目前沒有啟用中的院民。</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleGroup.residents.map((resident) => {
              const draft = drafts[resident.id] ?? EMPTY_DRAFT;

              return (
                <article
                  key={resident.id}
                  className={`rounded-[24px] border-2 bg-white p-4 shadow-soft ${cardStatusStyle(draft.status_type)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-black text-ink">{resident.full_name}</h3>
                      <p className="mt-1 text-sm text-stone-500">房號 {resident.room_no || "未分房"}</p>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-black ${badgeStatusStyle(draft.status_type)}`}>
                      {STATUS_LABELS[draft.status_type]}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <StatusButton
                      label="正常"
                      emoji={STATUS_FACE.normal}
                      active={draft.status_type === "normal"}
                      color="green"
                      disabled={!canEdit}
                      onClick={() => updateDraft(resident.id, { status_type: "normal", original_note: "", family_note: "" })}
                    />
                    <StatusButton
                      label="不佳"
                      emoji={STATUS_FACE.unwell}
                      active={draft.status_type === "unwell"}
                      color="orange"
                      disabled={!canEdit}
                      onClick={() => updateDraft(resident.id, { status_type: "unwell" })}
                    />
                    <StatusButton
                      label="住院"
                      emoji={STATUS_FACE.hospital}
                      active={draft.status_type === "hospital"}
                      color="red"
                      disabled={!canEdit}
                      onClick={() => updateDraft(resident.id, { status_type: "hospital" })}
                    />
                  </div>

                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="text-sm font-bold text-ink">護理師原始備註</label>
                        <button
                          type="button"
                          className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-coral transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={!canEdit || draft.status_type === "normal" || transformingResidentId === resident.id}
                          onClick={() => void handleGenerateFamilyNote(resident.id)}
                        >
                          {transformingResidentId === resident.id ? "轉換中..." : "轉為家屬版"}
                        </button>
                      </div>
                      <textarea
                        className="field min-h-[96px] text-sm"
                        value={draft.original_note}
                        onChange={(event) => updateDraft(resident.id, { original_note: event.target.value })}
                        placeholder={draft.status_type === "normal" ? "正常可留空" : "請輸入護理師原始備註"}
                        disabled={!canEdit || draft.status_type === "normal"}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-ink">給家屬的說明</label>
                      <textarea
                        className="field min-h-[88px] text-sm"
                        value={draft.family_note}
                        onChange={(event) => updateDraft(resident.id, { family_note: event.target.value })}
                        placeholder={draft.status_type === "normal" ? "正常可留空" : "可點擊上方按鈕自動產生，再手動調整"}
                        disabled={!canEdit || draft.status_type === "normal"}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-stone-500">目前選取：{STATUS_LABELS[draft.status_type]}</p>
                    {isDirty(resident.id, drafts, dbStatusMap) ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">尚未儲存</span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">已同步</span>
                    )}
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

function QuickDateButton({
  active,
  disabled,
  onClick,
  children
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`h-11 rounded-full px-4 text-sm font-semibold transition ${
        active ? "bg-coral text-white shadow-soft" : "border border-orange-200 bg-white text-stone-700 hover:bg-orange-50"
      }`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function CompactStatCard({
  title,
  value,
  icon,
  tone
}: {
  title: string;
  value: string;
  icon: ReactNode;
  tone: "orange" | "green" | "amber";
}) {
  const palette = {
    orange: "bg-orange-50 text-coral",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700"
  } as const;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{title}</p>
          <p className="mt-1 text-3xl font-black text-ink">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${palette[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}

function StatusButton({
  label,
  emoji,
  active,
  color,
  disabled,
  onClick
}: {
  label: string;
  emoji: string;
  active: boolean;
  color: "green" | "orange" | "red";
  disabled: boolean;
  onClick: () => void;
}) {
  const palette = {
    green: active
      ? "border-4 border-emerald-600 bg-emerald-200 text-emerald-900 shadow-lg"
      : "border-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    orange: active
      ? "border-4 border-orange-600 bg-orange-200 text-orange-900 shadow-lg"
      : "border-2 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100",
    red: active
      ? "border-4 border-rose-600 bg-rose-200 text-rose-900 shadow-lg"
      : "border-2 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
  } as const;

  return (
    <button
      type="button"
      className={`rounded-[20px] px-2 py-3 text-center transition ${palette[color]} disabled:cursor-not-allowed disabled:opacity-60`}
      disabled={disabled}
      onClick={onClick}
    >
      <div className="text-2xl">{emoji}</div>
      <div className="mt-1 text-sm font-black">{label}</div>
      <div className="mt-1 min-h-[18px] text-[11px] font-bold">{active ? "已選取" : ""}</div>
      {active ? <CheckCircle2 className="mx-auto mt-1 h-4 w-4" /> : null}
    </button>
  );
}

function roomCardClassName({
  active,
  complete,
  dirty
}: {
  active: boolean;
  complete: boolean;
  dirty: boolean;
}) {
  if (active && complete) {
    return "rounded-[18px] border-2 border-emerald-500 bg-emerald-50 px-3 py-3 text-left shadow-soft transition";
  }

  if (active) {
    return "rounded-[18px] border-2 border-orange-400 bg-orange-50 px-3 py-3 text-left shadow-soft transition";
  }

  if (complete) {
    return "rounded-[18px] border-2 border-emerald-200 bg-white px-3 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50";
  }

  if (dirty) {
    return "rounded-[18px] border-2 border-amber-300 bg-white px-3 py-3 text-left transition hover:bg-orange-50/50";
  }

  return "rounded-[18px] border-2 border-orange-200 bg-white px-3 py-3 text-left transition hover:bg-orange-50/50";
}

function buildDrafts(residents: Resident[], statuses: DailyStatus[]) {
  const statusMap = new Map(statuses.map((item) => [item.resident_id, item]));

  return Object.fromEntries(
    residents.map((resident) => {
      const found = statusMap.get(resident.id);
      return [
        resident.id,
        {
          status_type: found?.status_type ?? "normal",
          original_note: found?.original_note ?? found?.note ?? "",
          family_note: found?.family_note ?? ""
        }
      ];
    })
  ) as Record<string, ResidentDraft>;
}

function isDirty(
  residentId: string,
  drafts: Record<string, ResidentDraft>,
  dbStatusMap: Map<string, ResidentDraft>
) {
  const draft = drafts[residentId] ?? EMPTY_DRAFT;
  const saved = dbStatusMap.get(residentId) ?? EMPTY_DRAFT;
  return (
    draft.status_type !== saved.status_type ||
    draft.original_note !== saved.original_note ||
    draft.family_note !== saved.family_note
  );
}

function cardStatusStyle(status: DailyStatusType) {
  if (status === "normal") return "border-emerald-300 ring-2 ring-emerald-50";
  if (status === "unwell") return "border-orange-300 ring-2 ring-orange-50";
  return "border-rose-300 ring-2 ring-rose-50";
}

function badgeStatusStyle(status: DailyStatusType) {
  if (status === "normal") return "bg-emerald-100 text-emerald-800";
  if (status === "unwell") return "bg-orange-100 text-orange-800";
  return "bg-rose-100 text-rose-800";
}

function normalizeRoom(room: string | null) {
  const value = room?.trim();
  return value ? value : "未分房";
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

function shiftDate(date: string, offsetDays: number) {
  const target = new Date(`${date}T00:00:00`);
  target.setDate(target.getDate() + offsetDays);
  return toDateInputValue(target);
}

function endOfMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const target = new Date(year, month, 0);
  return toDateInputValue(target);
}

function getDateRange(startDate: string, endDate: string) {
  const result: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (cursor <= end) {
    result.push(toDateInputValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
