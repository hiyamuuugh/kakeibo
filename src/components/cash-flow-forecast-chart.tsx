"use client";

import { useEffect, useRef, useState } from "react";
import { Line, LineChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatShortAmount } from "@/lib/chart-format";
import type { simulateCashPlan } from "@/lib/cash-flow-plan";
import { cashFlowAxis, cashFlowAxisOffset, visibleCashFlowRange } from "@/lib/cash-flow-axis";
import { forecastTicks } from "@/lib/cash-flow-prediction";

type Point = ReturnType<typeof simulateCashPlan>[number];
type ChartPoint = Point & { position: number; aiTotal?: number };
const yen = (value: number) => `${value < 0 ? "−" : ""}${formatShortAmount(value)}円`;
function ChartTip({ active, payload, showPrediction }: { active?: boolean; payload?: readonly { payload?: ChartPoint }[]; showPrediction: boolean }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return <div className="rounded-xl border border-border bg-white p-3 text-xs shadow-lg"><p className="font-semibold">{row.label}</p><p className="mt-2">資産合計（通常試算）　{yen(row.total)}</p>{showPrediction && row.aiTotal !== undefined && <p className="mt-1 text-[#7a678c]">AI予測　{yen(row.aiTotal)}</p>}<p className="mt-1">現預金　{yen(row.cash)}</p><p className="mt-1">非現金資産　{yen(row.investment)}</p><p className="mt-2 text-muted-foreground">ルールの支出　{yen(row.expenses)}</p><p className="mt-1 text-muted-foreground">積立額　{yen(row.contributions)}</p><p className="mt-1 text-muted-foreground">運用損益　{yen(row.gain)}</p></div>;
}
export function CashFlowForecastChart({ points, error, hasInvestments, predictionPoints = [], predictionError = "" }: { points: Point[]; error: string; hasInvestments: boolean; predictionPoints?: Point[]; predictionError?: string }) {
  const [mode, setMode] = useState<"all" | 1 | 5 | 10>("all");
  const [showPrediction, setShowPrediction] = useState(true);
  const scrolling = mode !== "all";
  const [showBreakdown, setShowBreakdown] = useState(false);
  const plotBreakdown = hasInvestments && (!scrolling || showBreakdown);
  const ticks = forecastTicks(points.length, mode);
  const chartWidth = Math.max(360, (scrolling ? Math.ceil(Math.max(0, points.length - 1) / mode) : 0) * 72 + 120);
  const hasPrediction = predictionPoints.length === points.length && points.length > 0;
  const data = points.map((point, i): ChartPoint => ({ ...point, position: i, aiTotal: hasPrediction ? predictionPoints[i].total : undefined }));
  const scroll = useRef<HTMLDivElement>(null);
  const [windowRange, setWindowRange] = useState({ start: 0, end: 0 });
  function updateRange() {
    const el = scroll.current;
    if (!el) return;
    const next = visibleCashFlowRange(el.scrollLeft, el.clientWidth, chartWidth, points.length);
    setWindowRange(current => current.start === next.start && current.end === next.end ? current : next);
  }
  useEffect(() => {
    const el = scroll.current; if (!el) return;
    const observer = new ResizeObserver(updateRange); observer.observe(el); updateRange();
    return () => observer.disconnect();
  }, [mode, chartWidth, points.length]);
  const visible = scrolling ? data.slice(windowRange.start, windowRange.end + 1) : data;
  const axis = cashFlowAxis(visible.flatMap(point => [point.total, ...(plotBreakdown ? [point.cash, point.investment] : []), ...(showPrediction && point.aiTotal !== undefined ? [point.aiTotal] : [])]));
  const offset = cashFlowAxisOffset(axis.domain, scrolling);
  const axisLabel = (value: number) => `${value - offset < 0 ? "−" : ""}${formatShortAmount(value - offset)}`;
  return <div className="mt-4">
    <div role="group" aria-label="グラフの表示方法" className="flex w-fit flex-wrap gap-1 rounded-lg bg-muted p-1">
      {([["all", "全期間"], [1, "1年単位"], [5, "5年単位"], [10, "10年単位"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={`rounded-md px-3 py-2 text-xs font-semibold ${mode === value ? "bg-[#3f6f51] text-white" : "text-muted-foreground"}`}>{label}</button>)}
    </div>
    <label className="mt-3 flex items-center gap-2 text-xs text-[#7a678c]"><input type="checkbox" checked={showPrediction} disabled={!hasPrediction} onChange={e => setShowPrediction(e.target.checked)} className="accent-[#7a678c]" />AI予測も表示する</label>
    {scrolling && hasInvestments && <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={showBreakdown} onChange={e => setShowBreakdown(e.target.checked)} />現預金・非現金資産の内訳も表示</label>}
    {offset !== 0 && <p className="mt-3 text-[11px] text-muted-foreground" aria-label="縦軸の基準額">基準額 ¥{offset.toLocaleString("ja-JP")}（縦軸は基準額からの差額）</p>}
    <div className="mt-4 flex min-w-0">
    {!error && points.length > 0 && <div className="relative h-80 w-[82px] shrink-0" aria-label="表示期間の金額軸">{axis.ticks.map(value => <span key={value} className="absolute right-2 whitespace-nowrap text-[10px] text-muted-foreground" style={{ top: 12 + (axis.domain[1] - value) / (axis.domain[1] - axis.domain[0]) * 278, transform: "translateY(-50%)" }}>{axisLabel(value)}</span>)}</div>}
    <div ref={scroll} onScroll={updateRange} className="w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-lg" role="region" aria-label={scrolling ? `${mode}年単位の見通し（横スクロール）` : "全期間の見通し"} tabIndex={scrolling ? 0 : undefined}>
      <div className="h-80 min-w-0" style={scrolling && points.length ? { width: chartWidth } : { width: "100%" }} role="img" aria-label="年齢別の通常試算とAI予測の見通しグラフ">
        {error ? <p className="py-20 text-center text-sm text-destructive" role="alert">{error}</p> : !points.length ? <p className="py-24 text-center text-sm text-muted-foreground">設定のアカウントの鉛筆から生年月日を登録してください。</p> : <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 12, right: 24, left: 0, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e2e8ed" /><XAxis type="number" dataKey="position" domain={[0, Math.max(1, points.length - 1)]} ticks={ticks} interval={0} tickFormatter={value => points[Number(value)]?.label ?? ""} tick={{ fontSize: 10 }} /><YAxis hide domain={axis.domain} ticks={axis.ticks} allowDataOverflow /><Tooltip content={<ChartTip showPrediction={showPrediction && hasPrediction} />} /><ReferenceLine y={0} ifOverflow="hidden" stroke="#ad3929" strokeDasharray="3 3" />{plotBreakdown && <Line dataKey="cash" name="現預金" stroke="#245f8b" dot={false} strokeWidth={2} isAnimationActive={false} />}{plotBreakdown && <Line dataKey="investment" name="非現金資産" stroke="#96651a" dot={false} strokeWidth={2} isAnimationActive={false} />}<Line dataKey="total" name="資産合計（通常試算）" stroke="#3f6f51" dot={false} strokeWidth={2.5} isAnimationActive={false} />{hasPrediction && showPrediction && <Line dataKey="aiTotal" name="AI予測" stroke="#7a678c" strokeDasharray="6 4" dot={false} strokeWidth={2.5} isAnimationActive={false} />}</LineChart></ResponsiveContainer>}
      </div>
    </div>
    </div>
    <div className="mt-2 flex flex-wrap gap-4 text-[11px]"><span className="text-[#3f6f51]">● 資産合計（通常試算）</span>{plotBreakdown && <><span className="text-[#245f8b]">● 現預金</span><span className="text-[#96651a]">● 非現金資産</span></>}{hasPrediction && showPrediction && <span className="text-[#7a678c]">┄ AI予測</span>}</div>
    {predictionError && <p role="alert" className="mt-3 text-xs text-destructive">AI予測：{predictionError}</p>}
    <p className="mt-3 text-[10px] leading-5 text-muted-foreground">各年齢の1年間を反映。積立は月末・想定年率を月換算して複利計算します。</p>
  </div>;
}
