"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "ダッシュボード" },
  { href: "/transactions", label: "取引一覧" },
  { href: "/import", label: "CSV取込" },
  { href: "/budgets", label: "予算管理" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 h-14">
        <span className="font-bold text-lg mr-4">家計簿</span>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              pathname === link.href
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
