"use client";

import Papa from "papaparse";
import { useMemo, useState, type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Pencil, Upload, UserPlus } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { safeFetchJson } from "@/lib/utils";
import type { Resident, UserRole } from "@/lib/types";

type Props = {
  initialResidents: Resident[];
  role: UserRole;
};

type ResidentForm = {
  full_name: string;
  room_no: string;
  gender: string;
  birth_date: string;
  family_contact: string;
  active: boolean;
};

const emptyForm: ResidentForm = {
  full_name: "",
  room_no: "",
  gender: "",
  birth_date: "",
  family_contact: "",
  active: true
};

const ROOM_CAPACITY = 6;

export function ResidentManagement({ initialResidents, role }: Props) {
  const [residents, setResidents] = useState(initialResidents);
  const [form, setForm] = useState<ResidentForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const readOnly = role === "nurse";
  const activeCount = useMemo(() => residents.filter((item) => item.active).length, [residents]);

  const groupedResidents = useMemo(() => {
    const groups = new Map<string, Resident[]>();

    for (const resident of residents) {
      const roomKey = normalizeRoom(resident.room_no);
      const list = groups.get(roomKey) ?? [];
      list.push(resident);
      groups.set(roomKey, list);
    }

    return Array.from(groups.entries())
      .sort(([roomA], [roomB]) => compareRoom(roomA, roomB))
      .map(([room, roomResidents]) => ({
        room,
        residents: [...roomResidents].sort((a, b) => a.full_name.localeCompare(b.full_name, "zh-Hant"))
      }));
  }, [residents]);

  async function refreshResidents() {
    const payload = await safeFetchJson<{ success: boolean; residents: Resident[] }>("/api/residents");
    setResidents(payload.residents);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const payload = {
      ...(editingId ? { id: editingId } : {}),
      full_name: form.full_name.trim(),
      room_no: form.room_no.trim() || null,
      gender: form.gender || null,
      birth_date: form.birth_date || null,
      family_contact: form.family_contact.trim() || null,
      active: form.active
    };

    try {
      await safeFetchJson<{ success: boolean; resident: Resident }>("/api/residents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      setForm(emptyForm);
      setEditingId(null);
      await refreshResidents();
      setMessage(editingId ? "院民資料已更新。" : "新增院民成功。");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "儲存院民資料失敗。");
    }
  }

  function startEdit(resident: Resident) {
    setEditingId(resident.id);
    setMessage("");
    setError("");
    setForm({
      full_name: resident.full_name,
      room_no: resident.room_no ?? "",
      gender: resident.gender ?? "",
      birth_date: resident.birth_date ?? "",
      family_contact: resident.family_contact ?? "",
      active: resident.active
    });
  }

  async function handleCsvImport(file: File) {
    setMessage("");
    setError("");

    try {
      const result = await new Promise<Papa.ParseResult<Record<string, string>>>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: resolve,
          error: reject
        });
      });

      const rows = result.data.map((row) => ({
        full_name: row.full_name || row.name || "",
        room_no: row.room_no || row.room || "",
        gender: row.gender || "",
        birth_date: row.birth_date || "",
        family_contact: row.family_contact || "",
        active: row.active ? row.active !== "false" : true
      }));

      await safeFetchJson("/api/residents/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows })
      });

      await refreshResidents();
      setMessage("CSV 匯入完成。");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "CSV 匯入失敗。");
    }
  }

  function clearForm() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  return (
    <div className="space-y-6">
      <section className="card p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <SectionHeader
            title="院民管理"
            description="可新增、編輯、停用院民，也支援 CSV 批次匯入名單。"
          />

          <div className="rounded-[28px] bg-orange-50 px-6 py-5 text-center">
            <p className="text-lg text-stone-500">使用中院民</p>
            <p className="text-4xl font-black text-coral">{activeCount}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="card p-8">
          <div className="mb-5 flex items-center gap-3">
            <UserPlus className="h-7 w-7 text-coral" />
            <h2 className="text-3xl font-black text-ink">新增 / 編輯院民</h2>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              className="field"
              placeholder="姓名"
              value={form.full_name}
              onChange={(event) => updateForm(setForm, "full_name", event)}
              disabled={readOnly}
              required
            />

            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="field"
                placeholder="房號"
                value={form.room_no}
                onChange={(event) => updateForm(setForm, "room_no", event)}
                disabled={readOnly}
              />

              <select
                className="field"
                value={form.gender}
                onChange={(event) => updateForm(setForm, "gender", event)}
                disabled={readOnly}
              >
                <option value="">未填寫</option>
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
            </div>

            <input
              className="field"
              type="date"
              value={form.birth_date}
              onChange={(event) => updateForm(setForm, "birth_date", event)}
              disabled={readOnly}
            />

            <input
              className="field"
              placeholder="家屬聯絡方式"
              value={form.family_contact}
              onChange={(event) => updateForm(setForm, "family_contact", event)}
              disabled={readOnly}
            />

            <label className="flex items-center gap-3 rounded-2xl bg-orange-50 px-4 py-3 text-lg font-semibold text-ink">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
                disabled={readOnly}
              />
              啟用此院民
            </label>

            <div className="flex flex-wrap gap-3">
              <button type="submit" className="button-primary" disabled={readOnly}>
                {editingId ? "儲存變更" : "新增院民"}
              </button>

              <button type="button" className="button-secondary" onClick={clearForm}>
                清空表單
              </button>
            </div>
          </form>

          {message ? <p className="mt-4 text-lg font-semibold text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-4 text-lg font-semibold text-red-700">{error}</p> : null}
        </div>

        <div className="card p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-3xl font-black text-ink">院民清單</h2>
              <p className="mt-2 text-lg text-stone-600">
                依房號查看整房配置，右側以兩欄方式顯示每位院民與使用狀態。
              </p>
              <p className="mt-2 text-sm text-stone-500">
                CSV 欄位建議：<code className="rounded bg-orange-50 px-2 py-1">full_name, room_no, gender, birth_date, family_contact, active</code>
              </p>
            </div>

            <label className="button-secondary cursor-pointer gap-2">
              <Upload className="h-5 w-5" />
              匯入 CSV
              <input
                type="file"
                accept=".csv"
                className="hidden"
                disabled={readOnly}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleCsvImport(file);
                  }
                }}
              />
            </label>
          </div>

          <div className="mt-6 space-y-4">
            {groupedResidents.map((group) => {
              const slots = buildRoomSlots(group.residents);

              return (
                <section key={group.room} className="rounded-[26px] border border-orange-200 bg-orange-50/55 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-black text-ink">房號 {group.room}</h3>
                      <p className="mt-1 text-sm text-stone-500">
                        共 {group.residents.length} 位
                        {group.residents.length < ROOM_CAPACITY ? `，尚有 ${ROOM_CAPACITY - group.residents.length} 個空位` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {slots.map((resident, index) =>
                      resident ? (
                        <div
                          key={resident.id}
                          className="flex min-h-[52px] items-center justify-between gap-4 rounded-xl border border-white/70 bg-white px-4 py-3"
                        >
                          <div className="grid min-w-0 flex-1 grid-cols-[minmax(10rem,1.6fr)_auto] items-center gap-4">
                            <span className="truncate whitespace-nowrap text-base font-bold leading-none text-ink">
                              {resident.full_name}
                            </span>
                            <span
                              className={`whitespace-nowrap text-sm font-semibold ${
                                resident.active ? "text-emerald-700" : "text-stone-400"
                              }`}
                            >
                              {resident.active ? "使用中" : "停用"}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-1 text-[11px] font-semibold text-coral transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => startEdit(resident)}
                            disabled={readOnly}
                          >
                            <Pencil className="h-3 w-3" />
                            編輯
                          </button>
                        </div>
                      ) : (
                        <div
                          key={`empty-${group.room}-${index}`}
                          className="flex min-h-[48px] items-center rounded-xl bg-white/40 px-4 py-2 text-sm font-semibold text-stone-400"
                        >
                          空位
                        </div>
                      )
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function updateForm(
  setForm: Dispatch<SetStateAction<ResidentForm>>,
  key: keyof Omit<ResidentForm, "active">,
  event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
) {
  const value = event.target.value;
  setForm((prev) => ({ ...prev, [key]: value }));
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

function buildRoomSlots(residents: Resident[]) {
  const slots = [...residents];
  while (slots.length < ROOM_CAPACITY) {
    slots.push(null as never);
  }
  return slots.slice(0, ROOM_CAPACITY) as Array<Resident | null>;
}
