"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { comparisonInvestments, comparisonRows, type CashFlowPoint } from "@/lib/cash-flow-comparison";
const money = (value: number) => `${value < 0 ? "−" : ""}¥${Math.abs(value).toLocaleString("ja-JP")}`;
const signedMoney = (value: number) => `${value > 0 ? "+" : ""}${money(value)}`;
function percent(value: number | null) {
  if (value === null) return "—（比較元が0円以下）";
  if (value !== 0 && Math.abs(value) < 0.01) return value > 0 ? "+0.01%未満" : "−0.01%未満";
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toLocaleString("ja-JP", { maximumFractionDigits: 2 })}%`;
}
function Difference({ difference, rate }: { difference: number; rate: number | null }) {
  return <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs"><span className={difference < 0 ? "text-[#c1432f]" : "text-[#3f6f51]"}>差額 {signedMoney(difference)}</span><span className="text-muted-foreground">増減率 {percent(rate)}</span></div>;
}
export function CashFlowYearComparison({ points, predictionPoints }: { points: CashFlowPoint[]; predictionPoints: CashFlowPoint[] }) {
  const [open, setOpen] = useState(true), [model, setModel] = useState<"normal" | "ai">("normal");
  const [leftYear, setLeftYear] = useState(2030), [rightYear, setRightYear] = useState(2050);
  const hasAi = predictionPoints.length > 1 && predictionPoints.length === points.length;
  const usingAi = model === "ai" && hasAi;
  const series = (usingAi ? predictionPoints : points).filter(point => point.year !== null);
  const years = series.map(point => point.year!);
  const selectYear = (value: number) => years.includes(value) ? value : years.length ? Math.max(years[0], Math.min(years.at(-1)!, value)) : value;
  const left = series.find(point => point.year === selectYear(leftYear)), right = series.find(point => point.year === selectYear(rightYear));
  const rows = left && right ? comparisonRows(left, right) : [], investments = left && right ? comparisonInvestments(left, right) : [];
  return <section className="rounded-2xl border border-border bg-white p-4 sm:p-6">
    <button type="button" aria-expanded={open} aria-controls="cash-flow-year-comparison" onClick={() => setOpen(value => !value)} className="flex w-full items-center justify-between gap-3 text-left"><span className="text-base font-semibold">年別の資産比較</span><ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} /></button>
    <div id="cash-flow-year-comparison" hidden={!open} className="mt-4">
      <div role="group" aria-label="比較する試算" className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
        <button type="button" aria-pressed={!usingAi} onClick={() => setModel("normal")} className={`rounded-md px-3 py-2 text-xs font-semibold ${!usingAi ? "bg-[#3f6f51] text-white" : "text-muted-foreground"}`}>通常試算</button>
        <button type="button" aria-pressed={usingAi} disabled={!hasAi} onClick={() => setModel("ai")} className={`rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-40 ${usingAi ? "bg-[#7a678c] text-white" : "text-muted-foreground"}`}>AI予測</button>
      </div>
      {!hasAi && <p className="mt-2 text-[11px] text-muted-foreground">AI予測は、学習に必要な記録がそろうと比較できます。</p>}
      {!left || !right ? <p className="py-6 text-center text-sm text-muted-foreground">アカウントの生年月日と基本設定を登録すると、年ごとの資産を比較できます。</p> : <>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="min-w-0 text-sm">比較元<select aria-label="比較元" value={left.year!} onChange={e => setLeftYear(Number(e.target.value))} className="mt-1.5 w-full min-w-0 rounded-lg border border-border bg-white px-3 py-2.5 text-base">{years.map(year => <option key={year} value={year}>{year}年</option>)}</select></label>
          <label className="min-w-0 text-sm">比較先<select aria-label="比較先" value={right.year!} onChange={e => setRightYear(Number(e.target.value))} className="mt-1.5 w-full min-w-0 rounded-lg border border-border bg-white px-3 py-2.5 text-base">{years.map(year => <option key={year} value={year}>{year}年</option>)}</select></label>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">グラフと同じ、各年12か月で計算した試算上の年末残高を比較します。差額は比較先−比較元、増減率は比較元の残高を基準に計算します。</p>
        <div className="mt-4 space-y-3">{rows.map(row => <article key={row.id} aria-label={row.name + "の比較"} className={`rounded-xl border p-3 ${row.id === "total" ? "border-[#b8cbbf] bg-[#f2f6f3]" : "border-border bg-background"}`}>
          <h3 className="text-sm font-semibold">{row.name}</h3><div className="mt-2 grid grid-cols-2 gap-3"><div><p className="text-[10px] text-muted-foreground">{left.year}年末</p><p className="mt-1 break-all text-sm font-semibold tabular-nums">{money(row.left)}</p></div><div><p className="text-[10px] text-muted-foreground">{right.year}年末</p><p className="mt-1 break-all text-sm font-semibold tabular-nums">{money(row.right)}</p></div></div><Difference difference={row.difference} rate={row.percent} />
        </article>)}</div>
        {investments.length > 0 && <div className="mt-5 space-y-3"><h3 className="text-sm font-semibold">NISA・投資の内訳</h3>{investments.map(row => <article key={row.id} aria-label={row.name + "の投資比較"} className="rounded-xl border border-border bg-background p-3">
          <h4 className="break-words text-sm font-semibold">{row.name}</h4><div className="mt-2 grid grid-cols-2 gap-3">{([{ year: left.year, balance: row.left, principal: row.leftPrincipal, profit: row.leftProfit }, { year: right.year, balance: row.right, principal: row.rightPrincipal, profit: row.rightProfit }]).map((value, i) => <div key={i} className="min-w-0"><p className="text-[10px] text-muted-foreground">{value.year}年末</p><p className="mt-1 break-all text-sm font-semibold tabular-nums">{money(value.balance)}</p><p className="mt-2 break-words text-[10px] leading-5 text-muted-foreground">試算元本 {money(value.principal)}<br />試算開始後の運用損益 {signedMoney(value.profit)}</p></div>)}</div><Difference difference={row.difference} rate={row.percent} />
        </article>)}</div>}
        <p className="mt-3 text-[10px] leading-5 text-muted-foreground">増減率＝（比較先の残高−比較元の残高）÷比較元の残高。積立元本を含む残高ベースです。比較元が0円以下の場合は増減率を算出しません。試算元本は開始残高と開始後の積立の合計です。金額は整数円へ四捨五入しています。</p>
      </>}
    </div>
  </section>;
}
