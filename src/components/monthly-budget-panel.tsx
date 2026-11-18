"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { categoryColor } from "@/lib/category-colors";
import { compareMonthlyBudget, parseMonthlyBudget, type MonthlyBudgetPlan, type budgetProgress } from "@/lib/monthly-budget";
const yen = (amount: number) => `¥${amount.toLocaleString("ja-JP")}`;
function Progress({ value }: { value: ReturnType<typeof budgetProgress> }) {
  return <div className="mt-2 space-y-1.5">
    <div role="progressbar" aria-label="予算の使用状況" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value.barPercent)} aria-valuetext={`${yen(value.spent)} / ${yen(value.budget)}${value.over ? "、予算超過" : ""}`} className="h-2 overflow-hidden rounded-full bg-[#edf2f6]"><div className={`h-full rounded-full ${value.over ? "bg-[#c1432f]" : "bg-[#3f6f51]"}`} style={{ width: `${value.barPercent}%` }} /></div>
    <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs"><span className="text-muted-foreground">支出 {yen(value.spent)} / 予算 {yen(value.budget)}</span><span className={`font-semibold ${value.over ? "text-[#ad3929]" : "text-[#3f6f51]"}`}>{value.over ? `${yen(-value.remaining)}オーバー` : `残り${yen(value.remaining)}`}{value.percent === null ? "" : ` · ${value.percent}%使用`}</span></div>
  </div>;
}
export function MonthlyBudgetPanel({ month, memberId, total, categories }: { month: string; memberId: string | null; total: number; categories: { id: string; name: string; total: number }[] }) {
  const [data, setData] = useState<{ plan: MonthlyBudgetPlan; monthlyOverrides: boolean; categoryNames: { id: string; name: string }[] } | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setError(false);
      try {
        const params = new URLSearchParams({ month }); if (memberId) params.set("memberId", memberId);
        const response = await fetch(`/api/budget-plan?${params}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("budget");
        const saved = await response.json(), plan = parseMonthlyBudget(saved.plan);
        if (!controller.signal.aborted) setData({ plan, monthlyOverrides: !!saved.monthlyOverrides, categoryNames: saved.categoryNames ?? [] });
      } catch { if (!controller.signal.aborted) { setData(null); setError(true); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load(); window.addEventListener("focus", load); window.addEventListener("kakeibo:budget-saved", load);
    return () => { controller.abort(); window.removeEventListener("focus", load); window.removeEventListener("kakeibo:budget-saved", load); };
  }, [month, memberId, retry]);
  const result = data ? compareMonthlyBudget(data.plan, total, categories) : null;
  const rows = result?.categories.slice().sort((a, b) => Number(b.over) - Number(a.over) || (b.spent - b.budget) - (a.spent - a.budget)) ?? [];
  return <section aria-label="予算の使用状況" className="rounded-xl border border-[#dce5ec] bg-white p-4 text-sm">
    <div className="flex items-center justify-between gap-3"><h2 className="font-bold">予算の使用状況</h2><Link href={`/settings${memberId ? `?budgetMemberId=${encodeURIComponent(memberId)}` : ""}#monthly-budget`} className="shrink-0 text-xs font-semibold text-primary underline underline-offset-2">予算を設定</Link></div>
    <p className="mt-1 text-xs text-muted-foreground">{month.replace("-", "年")}月 · {memberId ? "自分" : "家族全員"}</p>
    {loading ? <p className="mt-3 text-xs text-muted-foreground">予算を読み込み中…</p> : error ? <p role="alert" className="mt-3 text-xs text-destructive">予算を読み込めませんでした。<button type="button" onClick={() => setRetry(value => value + 1)} className="ml-2 underline">再読み込み</button></p> : result && <>
      {result.overall ? <div className="mt-3 rounded-lg bg-[#f4f6f8] p-3"><p className={`font-bold ${result.overall.over ? "text-[#ad3929]" : "text-[#3f6f51]"}`}>{result.overall.over ? `予算を${yen(-result.overall.remaining)}オーバーしています` : `予算内 · あと${yen(result.overall.remaining)}使えます`}</p><p className="mt-1 text-xs text-muted-foreground">{result.totalSource === "total" ? "全体の月予算" : "カテゴリ予算の合計"}と比較</p><Progress value={result.overall} /></div> : <p className="mt-3 text-muted-foreground">{memberId ? "自分" : "家族全員"}の毎月の予算は未設定です。</p>}
      {!!rows.length && <div className="mt-3 divide-y divide-[#edf2f6]">{rows.map(row => { const name = categories.find(category => category.id === row.categoryId)?.name ?? data?.categoryNames.find(category => category.id === row.categoryId)?.name ?? "カテゴリ"; return <div key={row.categoryId} className="py-3"><p className="flex items-center gap-2 font-semibold"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: categoryColor(name) }} />{name}</p><Progress value={row} /></div>; })}</div>}
      {result.overall && result.unbudgetedSpent > 0 && <p className="mt-2 text-xs text-muted-foreground">カテゴリ予算が未設定の支出：{yen(result.unbudgetedSpent)}（全体の支出に含みます）</p>}
      {data?.monthlyOverrides && <p className="mt-2 text-xs text-muted-foreground">以前にこの月だけ設定したカテゴリ予算を優先しています。</p>}
      {result.overall && <p className="mt-2 text-xs text-muted-foreground">記録済みの支出で比較しています。</p>}
    </>}
  </section>;
}
