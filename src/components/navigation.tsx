"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesCombined,
  FolderInput,
  PlusCircle,
  ReceiptText,
  Settings,
} from "lucide-react";
import { InstallButton } from "@/components/install-button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "ダッシュボード", icon: ChartNoAxesCombined },
  { href: "/transactions", label: "取引", icon: ReceiptText },
  { href: "/transactions/new", label: "入力", icon: PlusCircle },
  { href: "/import", label: "取込", icon: FolderInput },
  { href: "/settings", label: "設定", icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/select-member") {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-50 hidden border-b border-[#e5e7eb] bg-white md:block">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#eff6ff] text-sm font-bold text-[#3b82f6]">
                K
              </div>
              <div>
                <p className="text-sm font-bold text-[#1f2937]">kakeibo</p>
                <p className="text-xs text-[#6b7280]">家族用の家計簿</p>
              </div>
            </Link>
            <nav className="flex items-center gap-1">
              {links.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors",
                      active
                        ? "bg-[#3b82f6] text-white"
                        : "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#1f2937]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <InstallButton />
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e5e7eb] bg-white px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between gap-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors",
                  active
                    ? "bg-[#3b82f6] text-white"
                    : "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#1f2937]"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
