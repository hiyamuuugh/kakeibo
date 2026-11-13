"use client";

import { useState } from "react";
import { Line, LineChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  const yearly = mode === "year";
  const chartWidth = Math.max(360, points.length * 72 + 80);
  return <div className="mt-4">
    <div role="group" aria-label="グラフの表示方法" className="inline-flex rounded-lg bg-muted p-1">
      {([["all", "全期間"], ["year", "年毎"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={`rounded-md px-4 py-2 text-xs font-semibold ${mode === value ? "bg-[#3f6f51] text-white" : "text-muted-foreground"}`}>{label}</button>)}
    </div>
    {yearly && points.length > 0 && <p className="mt-3 text-[11px] text-muted-foreground">横にスクロールして年毎に確認できます。{points.at(-1)!.age}歳まで表示。</p>}
    <div className="mt-4 w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-lg" role="region" aria-label={yearly ? "年毎の見通し（横スクロール）" : "全期間の見通し"} tabIndex={yearly ? 0 : undefined}>
    <div className="h-80 min-w-0" style={yearly && points.length ? { width: chartWidth } : { width: "100%" }} role="img" aria-label="年齢別の現預金・非現金資産・合計資産の見通しグラフ">
      {error ? <p className="py-20 text-center text-sm text-destructive" role="alert">{error}</p> : !points.length ? <p className="py-24 text-center text-sm text-muted-foreground">下の基本設定で開始年齢を入力してください。</p> : <ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ top: 12, right: 20, left: -6, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e2e8ed" /><XAxis dataKey="label" interval={yearly ? 0 : "preserveStartEnd"} minTickGap={30} tick={{ fontSize: 10 }} /><YAxis width={82} tickFormatter={value => `${Number(value) < 0 ? "−" : ""}${formatShortAmount(Number(value))}`} tick={{ fontSize: 10 }} /><Tooltip content={<ChartTip />} /><ReferenceLine y={0} stroke="#ad3929" strokeDasharray="3 3" />{hasInvestments && <Line dataKey="cash" name="現預金" stroke="#245f8b" dot={yearly ? { r: 3 } : false} strokeWidth={2} isAnimationActive={false} />}{hasInvestments && <Line dataKey="investment" name="非現金資産" stroke="#96651a" dot={yearly ? { r: 3 } : false} strokeWidth={2} isAnimationActive={false} />}<Line dataKey="total" name="資産合計" stroke="#3f6f51" dot={yearly ? { r: 3 } : false} strokeWidth={2.5} isAnimationActive={false} /></LineChart></ResponsiveContainer>}
    </div>
    </div>
    <div className="mt-2 flex flex-wrap gap-4 text-[11px]"><span className="text-[#3f6f51]">● 資産合計</span>{hasInvestments && <><span className="text-[#245f8b]">● 現預金</span><span className="text-[#96651a]">● 非現金資産</span></>}</div>
    <p className="mt-3 text-[10px] leading-5 text-muted-foreground">各年齢の1年間を反映。積立は月末・想定年率を月換算して複利計算します。</p>
  </div>;
}
