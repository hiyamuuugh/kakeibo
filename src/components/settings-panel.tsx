"use client";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function SettingsPanel({ title, open, onToggle, contentId, children, id, label, className, nested = false }: {
  title: ReactNode;
  open: boolean;
  onToggle: () => void;
  contentId: string;
  children: ReactNode;
  id?: string;
  label?: string;
  className?: string;
  nested?: boolean;
}) {
  return <section id={id} aria-label={label} data-settings-panel={nested ? "nested" : "main"} className={cn("overflow-hidden rounded-xl border border-border bg-white", className)}>
    <button type="button" aria-expanded={open} aria-controls={contentId} onClick={onToggle} className={cn("flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-[#253b4b]", nested ? "p-3" : "p-4")}>
      <span className="flex min-w-0 flex-1 items-center gap-2">{title}</span>
      <ChevronDown aria-hidden="true" className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
    </button>
    <div id={contentId} hidden={!open} className={cn("space-y-4 border-t border-border", nested ? "p-3" : "p-4")}>{children}</div>
  </section>;
}
