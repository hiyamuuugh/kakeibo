"use client";

import { useRef, useState } from "react";
import { Line, LineChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatShortAmount } from "@/lib/chart-format";
import type { simulateCashPlan } from "@/lib/cash-flow-plan";

type Point = ReturnType<typeof simulateCashPlan>[number];
const yen = (value: number) => `${value < 0 ? "−" : ""}${formatShortAmount(value)}円`;
function ChartTip({ active, payload }: { active?: boolean; payload?: readonly { payload?: Point }[] }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return <div className="rounded-xl border border-border bg-white p-3 text-xs shadow-lg"><p className="font-semibold">{row.label}</p><p className="mt-2">資産合計　{yen(row.total)}</p><p className="mt-1">現預金　{yen(row.cash)}</p><p className="mt-1">非現金資産　{yen(row.investment)}</p><p className="mt-2 text-muted-foreground">ルールの支出　{yen(row.expenses)}</p><p className="mt-1 text-muted-foreground">積立額　{yen(row.contributions)}</p><p className="mt-1 text-muted-foreground">運用損益　{yen(row.gain)}</p></div>;
}

export function CashFlowForecastChart({ points, error, hasInvestments }: { points: Point[]; error: string; hasInvestments: boolean }) {
  const [mode, setMode] = useState<"all" | "year">("all");
  const [index, setIndex] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const max = Math.max(0, points.length - 2), safeIndex = Math.min(index, max);
  const year = points[safeIndex + 1], before = points[safeIndex];
  const yearly = mode === "year";
  const data = yearly ? points.slice(safeIndex, safeIndex + 2).map((point, i) => ({ ...point, ...(i === 0 ? { expenses: 0, contributions: 0, gain: 0 } : {}), label: i === 0 ? "年初" : "年末" })) : points;
  const move = (step: number) => setIndex(Math.min(max, Math.max(0, safeIndex + step)));
  return <div className="mt-4">
    <div role="group" aria-label="グラフの表示方法" className="inline-flex rounded-lg bg-muted p-1">
      {([["all", "全期間"], ["year", "1年ずつ"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={`rounded-md px-4 py-2 text-xs font-semibold ${mode === value ? "bg-[#3f6f51] text-white" : "text-muted-foreground"}`}>{label}</button>)}
    </div>
    {yearly && year && <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-2"><button type="button" aria-label="前年を見る" disabled={safeIndex === 0} onClick={() => move(-1)} className="rounded-lg border border-border p-2.5 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button><p className="text-sm font-semibold" aria-live="polite">{year.age}歳の1年間</p><button type="button" aria-label="翌年を見る" disabled={safeIndex === max} onClick={() => move(1)} className="rounded-lg border border-border p-2.5 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button></div>
      <input type="range" aria-label="表示する年齢" aria-valuetext={`${year.age}歳の1年間`} min={0} max={max} step={1} value={safeIndex} disabled={max === 0} onChange={e => setIndex(Number(e.target.value))} className="block w-full accent-[#3f6f51]" />
      <p className="text-center text-[10px] text-muted-foreground">スライダー・左右ボタン・グラフの横スワイプで1年ずつ移動</p>
    </div>}
    <div className="mt-4 h-80 w-full min-w-0" style={{ touchAction: yearly ? "pan-y" : "auto" }} role="img" aria-label={yearly && year ? `${year.age}歳の年初から年末の資産見通しグラフ` : "年齢別の現預金・非現金資産・合計資産の見通しグラフ"}
      onTouchStart={e => { const t = e.touches[0]; touch.current = t ? { x: t.clientX, y: t.clientY } : null; }}
      onTouchCancel={() => { touch.current = null; }}
      onTouchEnd={e => { const t = e.changedTouches[0], start = touch.current; touch.current = null; if (yearly && t && start && Math.abs(t.clientX - start.x) > 50 && Math.abs(t.clientX - start.x) > Math.abs(t.clientY - start.y)) move(t.clientX < start.x ? 1 : -1); }}>
      {error ? <p className="py-20 text-center text-sm text-destructive" role="alert">{error}</p> : !points.length ? <p className="py-24 text-center text-sm text-muted-foreground">下の基本設定で開始年齢を入力してください。</p> : <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 12, right: 20, left: -6, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e2e8ed" /><XAxis dataKey="label" minTickGap={30} tick={{ fontSize: 10 }} /><YAxis width={82} tickFormatter={value => `${Number(value) < 0 ? "−" : ""}${formatShortAmount(Number(value))}`} tick={{ fontSize: 10 }} /><Tooltip content={<ChartTip />} /><ReferenceLine y={0} stroke="#ad3929" strokeDasharray="3 3" />{hasInvestments && <Line dataKey="cash" name="現預金" stroke="#245f8b" dot={yearly ? { r: 3 } : false} strokeWidth={2} isAnimationActive={false} />}{hasInvestments && <Line dataKey="investment" name="非現金資産" stroke="#96651a" dot={yearly ? { r: 3 } : false} strokeWidth={2} isAnimationActive={false} />}<Line dataKey="total" name="資産合計" stroke="#3f6f51" dot={yearly ? { r: 3 } : false} strokeWidth={2.5} isAnimationActive={false} /></LineChart></ResponsiveContainer>}
    </div>
    <div className="mt-2 flex flex-wrap gap-4 text-[11px]"><span className="text-[#3f6f51]">● 資産合計</span>{hasInvestments && <><span className="text-[#245f8b]">● 現預金</span><span className="text-[#96651a]">● 非現金資産</span></>}</div>
    {yearly && year && before && <div aria-label="選択年の資産額" className="mt-4 rounded-xl bg-background p-3">
      <div className="grid grid-cols-2 gap-3"><div><p className="text-[11px] text-muted-foreground">年初の資産合計</p><p className="mt-1 break-words text-sm font-semibold">{yen(before.total)}</p></div><div><p className="text-[11px] text-muted-foreground">年末の資産合計</p><p className="mt-1 break-words text-sm font-semibold">{yen(year.total)}</p></div></div>
      <p className="mt-3 text-xs">年間の増減　{year.total >= before.total ? "+" : ""}{yen(year.total - before.total)}</p>
    </div>}
    <p className="mt-3 text-[10px] leading-5 text-muted-foreground">{yearly ? "年初・年末の2点を結んだ年単位の試算です。" : "各年齢の1年間を反映。"}積立は月末・想定年率を月換算して複利計算します。</p>
  </div>;
}
