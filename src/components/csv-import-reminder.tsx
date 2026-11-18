"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SELECTED_MEMBER_ID_KEY } from "@/lib/member-storage";
import type { CsvImportStatus } from "@/lib/csv-import-status";

const monthLabel = (month: string) => `${Number(month.slice(0, 4))}年${Number(month.slice(5))}月`;
const dismissKey = (member: string, month: string) => `kakeibo-csv-reminder-v2:${member}:${month}`;
type Notice = { status: CsvImportStatus & { acknowledged?: boolean }; member: string; name: string };

export function CsvImportReminder() {
  const pathname = usePathname();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ member: string; month: string; message: string } | null>(null);
  const hidden = pathname === "/login" || pathname === "/select-member";

  useEffect(() => {
    if (hidden) return;
    let cancelled = false;
    let revision = 0;
    const refresh = async () => {
      const request = ++revision;
      try {
        const membersResponse = await fetch("/api/members", { cache: "no-store" });
        if (!membersResponse.ok) throw new Error("members");
        const members: { id: string; name: string }[] = await membersResponse.json();
        if (!Array.isArray(members)) throw new Error("members");
        const member = members.find(item => item.id === localStorage.getItem(SELECTED_MEMBER_ID_KEY)) ?? members[0];
        const id = member?.id ?? "unassigned";
        const response = await fetch(`/api/import/status?memberId=${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("status");
        const status: Notice["status"] = await response.json();
        if (!Array.isArray(status.missingMonths) || !Array.isArray(status.sources)) throw new Error("status");
        if (!cancelled && request === revision) setNotice(!status.acknowledged && status.missingMonths.length && localStorage.getItem(dismissKey(id, status.currentMonth)) !== "1" ? { status, member: id, name: member?.name ?? "未設定" } : null);
      } catch {
        if (!cancelled && request === revision) setNotice(null);
      }
    };
    void refresh();
    const events = ["focus", "storage", "kakeibo:csv-imported", "kakeibo:member-changed"];
    for (const event of events) window.addEventListener(event, refresh);
    return () => { cancelled = true; for (const event of events) window.removeEventListener(event, refresh); };
  }, [pathname, hidden]);

  async function acknowledge() {
    if (!notice || saving) return;
    const selected = notice;
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/import/reminder-ack", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selected.member, month: selected.status.currentMonth }),
      });
      const data = await response.json();
      if (!response.ok || data.acknowledged !== true) throw new Error(data.error || "取込済の状態を保存できませんでした。");
      // Keep same-browser tabs in sync; the database is authoritative on other devices.
      try { localStorage.setItem(dismissKey(selected.member, selected.status.currentMonth), "1"); } catch {}
      setNotice(current => current?.member === selected.member && current.status.currentMonth === selected.status.currentMonth ? null : current);
    } catch (e) {
      setError({ member: selected.member, month: selected.status.currentMonth, message: e instanceof Error ? e.message : "保存できませんでした。もう一度お試しください。" });
    } finally { setSaving(false); }
  }

  if (hidden || !notice) return null;
  const { status } = notice;
  return (
    <aside aria-label="CSV取り込みのお知らせ" className="border-b border-[#c8dbe8] bg-[#e9f1f7] px-4 py-2.5 text-xs text-[#1f4f73]">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">先月分のCSVを取り込んでください。</p>
              <button type="button" onClick={acknowledge} disabled={saving} className="shrink-0 rounded-md border border-[#8faec5] bg-white px-3 py-1.5 font-semibold disabled:opacity-60">{saving ? "保存中…" : "取込済"}</button>
            </div>
            {error?.member === notice.member && error.month === status.currentMonth && <p role="alert" className="mt-2 text-[#ad3929]">{error.message}</p>}
            <p className="mt-1">{notice.name} · 過去6か月（今月を除く）の未取り込み月</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{status.missingMonths.map(month => <span key={month} className="rounded bg-white/70 px-2 py-1">{monthLabel(month)}</span>)}</div>
          </div>
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer">取り込み先ごとの未取り込み月</summary>
          <ul className="mt-2 space-y-1">{status.sources.map(source => <li key={source.id}><span className="font-semibold">{source.label}：</span>{source.missingMonths.length ? source.missingMonths.map(monthLabel).join("、") : "取り込み済み"}</li>)}</ul>
          <p className="mt-2 text-[11px]">{status.hasPriorImports ? "利用履歴のある取り込み先が対象です。" : "初回はすべての取り込み先を表示しています。"}CSVの明細日付と取り込み履歴で判定します。明細のない月や、一部のみ取り込んだ月は判別できません。</p>
        </details>
        <Link href="/import" className="mt-2 inline-block font-semibold underline underline-offset-2">CSV取り込みへ</Link>
      </div>
    </aside>
  );
}
