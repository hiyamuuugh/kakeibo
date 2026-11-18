"use client";
import { useEffect, useState } from "react";
import { categoryColor } from "@/lib/category-colors";
import { monthAt } from "@/lib/cash-flow";
import { buildCategoryMonthlyReport, type ReportMonth } from "@/lib/category-monthly-report";
const yen = (value: number) => `¥${value.toLocaleString("ja-JP")}`;
const difference = (value: { amount: number; percent: number | null }) => `${value.amount > 0 ? "+" : value.amount < 0 ? "−" : ""}${yen(Math.abs(value.amount))}${value.percent === null ? "（比較元¥0）" : `（${value.percent > 0 ? "+" : ""}${value.percent}%）`}`;
export function CategoryMonthlyReport({ current, memberId }: { current: ReportMonth; memberId: string | null }) {
  const [previous, setPrevious] = useState<ReportMonth[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    // Reset the comparison when its selected month/account request changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true); setError(false); setPrevious([]);
    Promise.all([-3, -2, -1].map(async offset => {
      const params = new URLSearchParams({ month: monthAt(current.month, offset) });
      if (memberId) params.set("memberId", memberId);
      const response = await fetch(`/api/stats/monthly?${params}`, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error("history");
      const data = await response.json();
      if (!Array.isArray(data.categories) || typeof data.total !== "number") throw new Error("history");
      return data as ReportMonth;
    })).then(data => { if (!controller.signal.aborted) setPrevious(data); }).catch(() => { if (!controller.signal.aborted) setError(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [current.month, memberId, retry]);
  const report = buildCategoryMonthlyReport(current, previous);
  return <section aria-label="マンスリーレポート" className="order-4 rounded-xl border border-[#dce5ec] bg-white p-4 text-sm">
    <h2 className="font-bold text-[#253b4b]">マンスリーレポート</h2>
    <p className="mt-1 text-xs text-muted-foreground">{current.month.replace("-", "年")}月 · カテゴリ別の支出と変化</p>
    {loading && <p className="mt-3 text-xs text-muted-foreground">比較データを読み込み中…</p>}
    {error && <p role="alert" className="mt-3 text-xs text-destructive">過去の比較データを読み込めませんでした。<button type="button" onClick={() => setRetry(value => value + 1)} className="ml-2 underline">再読み込み</button></p>}
    {!current.count ? <p className="mt-3 text-muted-foreground">この月の支出記録はまだありません。</p> : <div className="mt-3 space-y-1.5 rounded-lg bg-[#f4f6f8] p-3 text-xs leading-5">
      {report.rows[0] && <p>支出が最も多いのは「{report.rows[0].name}」で、{yen(report.rows[0].amount)}（全体の{report.rows[0].share}%）です。</p>}
      {report.biggestIncrease && <p>前月から最も増えたのは「{report.biggestIncrease.name}」：{difference(report.biggestIncrease.change!)}。</p>}
      {report.biggestDecrease && <p>前月から最も減ったのは「{report.biggestDecrease.name}」：{difference(report.biggestDecrease.change!)}。</p>}
      {report.uncategorized > 0 && <p>未分類が{yen(report.uncategorized)}あります。カテゴリを設定すると使いみちを確認しやすくなります。</p>}
    </div>}
    <div className="mt-3 divide-y divide-[#edf2f6]">{report.rows.map(row => <div key={row.id} className="py-3">
      <div className="flex items-start justify-between gap-3"><span className="flex min-w-0 items-center gap-2 font-semibold"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: categoryColor(row.name) }} />{row.name}</span><span className="shrink-0 text-right font-bold">{yen(row.amount)}<span className="ml-2 text-xs font-normal text-muted-foreground">{row.share}%</span></span></div>
      <div className="mt-1.5 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2"><p>前月比：<span className={row.change && row.change.amount > 0 ? "text-[#ad3929]" : row.change && row.change.amount < 0 ? "text-[#3f6f51]" : ""}>{row.change ? difference(row.change) : "比較データなし"}</span></p><p>直近平均：{row.average === null ? "比較データなし" : yen(row.average)}</p></div>
      {row.averageChange && <p className="mt-1 text-xs text-muted-foreground">平均との差：{difference(row.averageChange)}</p>}
    </div>)}</div>
    {!loading && <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">比較の対象と計算方法</summary><p className="mt-2 leading-5">前月比は{report.previousMonth ? `${report.previousMonth}の記録` : "前月の支出記録なし"}と比較します。直近平均は選択月の前3か月のうち、支出記録がある{report.historyMonths.length}か月{report.historyMonths.length ? `（${report.historyMonths.join("、")}）` : ""}の平均です。記録がある月で支出のないカテゴリは¥0として計算します。月途中やCSV未取り込みの場合も、記録済みの金額で比較しています。</p></details>}
  </section>;
}
