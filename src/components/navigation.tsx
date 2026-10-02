"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesCombined,
  CircleDollarSign,
  FolderInput,
  ReceiptText,
} from "lucide-react";
import { InstallButton } from "@/components/install-button";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "ダッシュボード", icon: ChartNoAxesCombined },
  { href: "/transactions", label: "取引", icon: ReceiptText },
  { href: "/import", label: "取込", icon: FolderInput },
  { href: "/budgets", label: "予算", icon: CircleDollarSign },
];

export function Navigation() {
  const pathname = usePathname();

  if (pathname === "/login") {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-50 hidden border-b border-slate-200 bg-white/95 backdrop-blur md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
                K
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">kakeibo</p>
                <p className="text-xs text-slate-500">家族用の家計簿</p>
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
                      "flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
            <LogoutButton />
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur md:hidden">
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
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}
          <LogoutButton mobile />
        </div>
      </nav>
    </>
  );
}
