"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const REMINDER_PREFIX = "kakeibo-csv-reminder-dismissed-";

export function CsvImportReminder() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pathname === "/login" || pathname === "/select-member") return;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (now.getDate() >= 1 && localStorage.getItem(`${REMINDER_PREFIX}${monthKey}`) !== "1") {
      // localStorage is only available after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
    }
  }, [pathname]);

  if (!visible) return null;

  const dismiss = () => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    localStorage.setItem(`${REMINDER_PREFIX}${monthKey}`, "1");
    setVisible(false);
  };

  return (
    <div className="border-b border-[#bfdbfe] bg-[#eff6ff] px-4 py-2.5">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <p className="min-w-0 flex-1 text-xs font-semibold text-[#1d4ed8]">今月のCSVを取り込みませんか？</p>
        <Link href="/import" className="shrink-0 rounded-md bg-[#2563eb] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1d4ed8]">
          CSV取込を開く
        </Link>
        <button type="button" onClick={dismiss} className="shrink-0 text-[#2563eb]" aria-label="通知を閉じる">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
