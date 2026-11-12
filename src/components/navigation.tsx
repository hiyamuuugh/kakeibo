"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
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
  { href: "/transactions", label: "一覧", icon: ReceiptText },
  { href: "/transactions/new", label: "入力", icon: PlusCircle },
  { href: "/price-notes", label: "底値帖", icon: BookOpen },
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
      <header className="sticky top-0 z-50 hidden border-b border-[#e6eae3] bg-white lg:block">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#eaf1e9] text-sm font-bold text-[#285d4d]">
                K
              </div>
              <div>
                <p className="text-sm font-bold text-[#263c34]">家計簿くん</p>
                <p className="text-xs text-[#748172]">家族用の家計簿</p>
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
                      "flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-2 text-sm font-semibold transition-colors",
                      active
                        ? "bg-[#285d4d] text-white"
                        : "text-[#748172] hover:bg-[#edf1e8] hover:text-[#263c34]"
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

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e6eae3] bg-white px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-between gap-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-start gap-1 rounded-lg px-0.5 py-2 text-[10px] font-medium transition-colors",
                  active
                    ? "bg-[#285d4d] text-white"
                    : "text-[#748172] hover:bg-[#edf1e8] hover:text-[#263c34]"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="min-h-7 w-full whitespace-normal break-all text-center leading-[14px]">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
