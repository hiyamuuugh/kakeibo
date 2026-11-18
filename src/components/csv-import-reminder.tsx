"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SELECTED_MEMBER_ID_KEY } from "@/lib/member-storage";
import type { CsvImportStatus } from "@/lib/csv-import-status";

const monthLabel = (month: string) => `${Number(month.slice(0, 4))}年${Number(month.slice(5))}月`;
const dismissKey = (member: string, month: string) => `kakeibo-csv-reminder-v2:${member}:${month}`;
type Notice = { status: CsvImportStatus; member: string; name: string };

export function CsvImportReminder() {
  const pathname = usePathname();
  const [notice, setNotice] = useState<Notice | null>(null);
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
        const status: CsvImportStatus = await response.json();
        if (!Array.isArray(status.missingMonths) || !Array.isArray(status.sources)) throw new Error("status");
        if (!cancelled && request === revision) setNotice(status.missingMonths.length && localStorage.getItem(dismissKey(id, status.currentMonth)) !== "1" ? { status, member: id, name: member?.name ?? "未設定" } : null);
      } catch {
        if (!cancelled && request === revision) setNotice(null);
      }
    };
    void refresh();
    const events = ["focus", "storage", "kakeibo:csv-imported", "kakeibo:member-changed"];
    for (const event of events) window.addEventListener(event, refresh);
    return () => { cancelled = true; for (const event of events) window.removeEventListener(event, refresh); };
  }, [pathname, hidden]);

  if (hidden || !notice) return null;
  const { status } = notice;
  return (
    <aside aria-label="CSV取り込みのお知らせ" className="border-b border-[#c8dbe8] bg-[#e9f1f7] px-4 py-2.5 text-xs text-[#1f4f73]">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">CSVを取り込みましょう。</p>
            <p className="mt-1">{notice.name} · 過去6か月（今月を除く）の未取り込み月</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{status.missingMonths.map(month => <span key={month} className="rounded bg-white/70 px-2 py-1">{monthLabel(month)}</span>)}</div>
          </div>
          <button type="button" onClick={() => { localStorage.setItem(dismissKey(notice.member, status.currentMonth), "1"); setNotice(null); }} className="shrink-0 p-1" aria-label="通知を閉じる"><X className="h-4 w-4" /></button>
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
