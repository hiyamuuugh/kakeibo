"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { monthAt, type CashFlowData } from "@/lib/cash-flow";
import { SELECTED_MEMBER_ID_KEY } from "@/lib/member-storage";
import { formatShortAmount } from "@/lib/chart-format";

const incoming = "#3f6f51", outgoing = "#c1432f", trend = "#3f6f51";
const yen = (value: number) => `${value < 0 ? "−" : ""}¥${Math.abs(value).toLocaleString("ja-JP")}`;
const signed = (value: number) => `${value > 0 ? "+" : ""}${yen(value)}`;
const thisMonth = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; };
const shortDate = (value: string) => `${Number(value.slice(5, 7))}/${Number(value.slice(8, 10))}`;
const axisAmount = (value: number) => `${value < 0 ? "−" : ""}${formatShortAmount(value)}`;
const tabClass = (active: boolean) => `rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${active ? "bg-[#3f6f51] text-white" : "text-muted-foreground hover:bg-muted"}`;
const card = "rounded-2xl border border-border bg-white p-4 sm:p-6";
function Amount({ value, className = "" }: { value: number; className?: string }) {
  return <span className={className} style={{ color: value > 0 ? incoming : value < 0 ? outgoing : undefined }}>{signed(value)}</span>;
}
function ChartTip({ active, payload, label }: { active?: boolean; payload?: readonly { name?: string | number; value?: number | string; color?: string; payload?: { date?: string; month?: string } }[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  const date = payload[0]?.payload?.date ?? payload[0]?.payload?.month ?? label;
  return <div className="rounded-lg border border-border bg-white p-3 text-xs shadow-sm"><p className="mb-2 font-semibold">{date}</p>{payload.map((item, index) => <p key={index} className="mt-1" style={{ color: item.color }}>{item.name}　{yen(Number(item.value ?? 0))}</p>)}</div>;
}

export default function CashFlowPage() {
  const [month, setMonth] = useState(thisMonth);
  const [view, setView] = useState<"personal" | "family">("personal");
  const [tab, setTab] = useState<"overview" | "sources" | "outlook">("overview");
  const [horizon, setHorizon] = useState(3);
  const [memberId, setMemberId] = useState("unassigned");
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function members() {
      try {
        const response = await fetch("/api/members", { signal: controller.signal });
        if (!response.ok) throw new Error();
        const list = await response.json() as { id: string }[];
        if (!Array.isArray(list)) throw new Error();
        const saved = localStorage.getItem(SELECTED_MEMBER_ID_KEY);
        setMemberId(list.find(member => member.id === saved)?.id ?? list[0]?.id ?? "unassigned"); setReady(true);
      } catch { if (!controller.signal.aborted) { setError("アカウントを読み込めませんでした。もう一度お試しください。"); setLoading(false); } }
    }
    void members(); return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError("");
      try {
        const params = new URLSearchParams({ month, memberId: view === "family" ? "all" : memberId });
        const response = await fetch(`/api/cash-flow?${params}`, { signal: controller.signal, cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "読み込めませんでした。");
        setData(body);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "読み込めませんでした。"); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [month, view, memberId, ready, retry]);
  const forecast = data?.outlook.points.slice(0, horizon + 1) ?? [];
  const estimate = forecast.at(-1)?.cumulative;
  return <div className="mx-auto max-w-4xl space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-bold">キャッシュフロー</h1><p className="mt-1 text-[11px] text-muted-foreground">記録ベースの収支</p></div><div className="flex items-center gap-1"><button type="button" aria-label="前の月" disabled={month <= "1900-01"} onClick={() => setMonth(value => monthAt(value, -1))} className="rounded-lg p-2 text-primary"><ChevronLeft className="h-5 w-5" /></button><input type="month" aria-label="表示月" value={month} max={thisMonth()} min="1900-01" onChange={e => { if (e.target.value && e.target.value <= thisMonth()) setMonth(e.target.value); }} className="min-w-0 max-w-40 rounded-lg border border-border bg-white px-2 py-2 text-sm font-semibold" /><button type="button" aria-label="次の月" disabled={month >= thisMonth()} onClick={() => setMonth(value => monthAt(value, 1))} className="rounded-lg p-2 text-primary disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button></div></div>
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">{(["personal", "family"] as const).map(value => <button key={value} type="button" aria-pressed={view === value} onClick={() => setView(value)} className={`rounded-lg py-2 text-xs font-semibold ${view === value ? "bg-[#dbe8f2] text-[#1f4f73] shadow-sm" : "text-muted-foreground"}`}>{value === "personal" ? "自分" : "家族全員"}</button>)}</div>
    <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-white p-1" aria-label="キャッシュフローの表示">{([{ id: "overview", label: "概要" }, { id: "sources", label: "記録元別" }, { id: "outlook", label: "見通し" }] as const).map(item => <button key={item.id} type="button" aria-pressed={tab === item.id} onClick={() => setTab(item.id)} className={tabClass(tab === item.id)}>{item.label}</button>)}</div>
    {loading && <div className={`${card} py-16 text-center text-sm text-muted-foreground`} role="status">読み込み中…</div>}
    {!loading && error && <div className={`${card} text-center`} role="alert"><p className="text-sm text-destructive">{error}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">再読み込み</button></div>}
    {!loading && !error && data && data.count === 0 && <div className={`${card} py-14 text-center`}><p className="text-sm text-muted-foreground">この期間までの取引がありません。</p><p className="mt-2 text-xs text-muted-foreground">家計簿に記録した取引からグラフを表示します。</p></div>}
    {!loading && !error && data && data.count > 0 && <>
      {tab === "overview" && <>
        <section className={`${card} bg-[#edf3f8]`}><div className="flex items-start justify-between gap-3"><div><h2 className="text-xs font-semibold text-muted-foreground">記録の累計収支</h2><p className="mt-2 text-3xl font-bold"><Amount value={data.cumulative} /></p></div><span className="rounded-full bg-white px-2 py-1 text-[10px] text-muted-foreground">{shortDate(data.asOf)} 時点</span></div><p className="mt-3 text-[10px] text-muted-foreground">{data.firstDate?.replaceAll("-", "/")} からの記録 · {data.count.toLocaleString()}件</p></section>
        <div className="grid grid-cols-3 gap-2"><section className="rounded-xl border border-border bg-white p-3"><h2 className="text-[11px] text-muted-foreground">選択月の収入</h2><p className="mt-2 break-all text-sm font-bold sm:text-xl" style={{ color: incoming }}>{yen(data.current.income)}</p></section><section className="rounded-xl border border-border bg-white p-3"><h2 className="text-[11px] text-muted-foreground">選択月の支出</h2><p className="mt-2 break-all text-sm font-bold sm:text-xl" style={{ color: outgoing }}>{yen(data.current.expense)}</p></section><section className="rounded-xl border border-border bg-white p-3"><h2 className="text-[11px] text-muted-foreground">選択月の収支</h2><p className="mt-2 break-all text-sm font-bold sm:text-xl"><Amount value={data.current.net} /></p></section></div>
        <section className={card}><h2 className="text-sm font-semibold">累計収支の推移</h2><div className="mt-5 h-64 w-full min-w-0" role="img" aria-label="選択月の日別累計収支グラフ"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.daily} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e2e8ed" /><XAxis dataKey="label" minTickGap={32} tick={{ fontSize: 10 }} /><YAxis width={58} tickFormatter={axisAmount} tick={{ fontSize: 10 }} /><Tooltip content={<ChartTip />} /><ReferenceLine y={0} stroke="#bcc9ce" /><Area name="累計収支" dataKey="cumulative" type="monotone" stroke={trend} fill="#dfebe2" strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div></section>
        <section className={card}><h2 className="text-sm font-semibold">月別の収入・支出</h2><div className="mt-3 flex gap-4 text-[11px]"><span style={{ color: incoming }}>● 収入</span><span style={{ color: outgoing }}>● 支出</span></div><div className="mt-3 h-60 w-full min-w-0" role="img" aria-label="過去12か月の収入と支出の棒グラフ"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.monthly} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e2e8ed" /><XAxis dataKey="month" tickFormatter={value => `${Number(String(value).slice(5))}月`} minTickGap={10} tick={{ fontSize: 10 }} /><YAxis width={58} tickFormatter={axisAmount} tick={{ fontSize: 10 }} /><Tooltip content={<ChartTip />} /><Bar name="収入" dataKey="income" fill={incoming} radius={[3, 3, 0, 0]} isAnimationActive={false} /><Bar name="支出" dataKey="expense" fill={outgoing} radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div></section>
      </>}
      {tab === "sources" && <>
        <section className={card}><h2 className="text-sm font-semibold">記録元別の収支</h2><p className="mt-2 text-[11px] text-muted-foreground">口座残高は未登録</p><div className="mt-5 h-64 w-full min-w-0" role="img" aria-label="記録元別の選択月の収入と支出グラフ"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.sources} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}><CartesianGrid horizontal={false} stroke="#e2e8ed" /><XAxis type="number" tickFormatter={axisAmount} tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 10 }} /><Tooltip content={<ChartTip />} /><Bar dataKey="income" name="収入" fill={incoming} isAnimationActive={false} /><Bar dataKey="expense" name="支出" fill={outgoing} isAnimationActive={false} /></BarChart></ResponsiveContainer></div><div className="mt-2 flex gap-4 text-[11px]"><span style={{ color: incoming }}>● 収入</span><span style={{ color: outgoing }}>● 支出</span></div></section>
        <div className="grid gap-3 sm:grid-cols-2">{data.sources.map(source => <section key={source.source} className={card}><h2 className="text-sm font-semibold">{source.label}</h2><div className="mt-3 flex items-center justify-between gap-3"><div><p className="text-[10px] text-muted-foreground">記録の累計収支</p><p className="mt-1 text-xl font-bold"><Amount value={source.cumulative} /></p></div><div className="h-14 w-24" aria-hidden="true"><ResponsiveContainer width="100%" height="100%"><LineChart data={source.history}><Line type="monotone" dataKey="cumulative" stroke={trend} strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></div><div className="mt-4 flex justify-between gap-2 border-t border-border pt-3 text-xs"><span className="text-muted-foreground">選択月の収支</span><Amount value={source.net} /></div><div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>収入 {yen(source.income)}</span><span>支出 {yen(source.expense)}</span></div></section>)}</div>
      </>}
      {tab === "outlook" && <>
        <section className={card}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold">収支の見通し</h2><div className="flex rounded-lg bg-muted p-1">{[1, 3, 6].map(value => <button key={value} type="button" aria-pressed={horizon === value} onClick={() => setHorizon(value)} className={tabClass(horizon === value)}>{value}か月</button>)}</div></div>
          {!data.outlook.baseline.length ? <p className="py-14 text-center text-sm text-muted-foreground">見通しに使う前月以前の記録がありません。</p> : <><p className="mt-4 text-[11px] text-muted-foreground">直近3か月のうち、記録がある{data.outlook.baseline.length}か月の平均で試算</p><div className="mt-5 h-64 w-full min-w-0" role="img" aria-label="過去の月平均収支による参考見通しグラフ"><ResponsiveContainer width="100%" height="100%"><LineChart data={forecast} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e2e8ed" /><XAxis dataKey="date" tickFormatter={shortDate} minTickGap={20} tick={{ fontSize: 10 }} /><YAxis width={58} tickFormatter={axisAmount} tick={{ fontSize: 10 }} /><Tooltip content={<ChartTip />} /><ReferenceLine y={0} stroke="#bcc9ce" /><Line name="参考見通し" type="linear" dataKey="cumulative" stroke={trend} strokeWidth={2.5} strokeDasharray="5 4" dot={{ r: 3 }} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></>}
        </section>
        {data.outlook.baseline.length > 0 && <><section className={`${card} bg-[#edf3f8]`}><h2 className="text-xs font-semibold text-muted-foreground">{horizon}か月後の累計収支（参考）</h2><p className="mt-3 text-3xl font-bold"><Amount value={estimate ?? data.cumulative} /></p><p className="mt-2 text-[11px] text-muted-foreground">{shortDate(forecast.at(-1)!.date)} 時点の試算</p></section><div className="grid grid-cols-2 gap-3"><section className={card}><h2 className="text-xs text-muted-foreground">月平均の収入</h2><p className="mt-2 text-lg font-bold" style={{ color: incoming }}>{yen(data.outlook.averageIncome)}</p></section><section className={card}><h2 className="text-xs text-muted-foreground">月平均の支出</h2><p className="mt-2 text-lg font-bold" style={{ color: outgoing }}>{yen(data.outlook.averageExpense)}</p></section></div><section className={card}><h2 className="text-xs text-muted-foreground">月平均の収支</h2><p className="mt-2 text-xl font-bold"><Amount value={data.outlook.averageNet} /></p><p className="mt-2 text-[10px] text-muted-foreground">使用した実績：{data.outlook.baseline.join(" / ")}</p></section></>}
      </>}
    </>}
  </div>;
}
