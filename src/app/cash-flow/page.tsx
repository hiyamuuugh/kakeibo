"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Line, LineChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { defaultCashPlan, parseCashPlan, simulateCashPlan, type CashPlan, type PlanRule } from "@/lib/cash-flow-plan";
import { japanToday } from "@/lib/cash-flow";
import { formatShortAmount } from "@/lib/chart-format";

const card = "rounded-2xl border border-border bg-white p-4 sm:p-6";
const input = "mt-1.5 w-full min-w-0 rounded-lg border border-border bg-white px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-ring";
const primary = "inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50";
const yen = (value: number) => `${value < 0 ? "−" : ""}¥${Math.abs(value).toLocaleString("ja-JP")}`;
const ageSpan = (from: number, to: number | null) => to === null ? `${from}歳以降` : `${from}〜${to}歳`;
type RangeDraft = { from: string; to: string; amount: string };
function ChartTip({ active, payload }: { active?: boolean; payload?: readonly { payload?: { label: string; cash: number; investment: number; total: number; expenses: number; contributions: number; gain: number } }[] }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return <div className="rounded-xl border border-border bg-white p-3 text-xs shadow-lg"><p className="font-semibold">{row.label}</p><p className="mt-2">資産合計　{yen(row.total)}</p><p className="mt-1">現預金　{yen(row.cash)}</p><p className="mt-1">非現金資産　{yen(row.investment)}</p><p className="mt-2 text-muted-foreground">ルールの支出　{yen(row.expenses)}</p><p className="mt-1 text-muted-foreground">積立額　{yen(row.contributions)}</p><p className="mt-1 text-muted-foreground">運用損益　{yen(row.gain)}</p></div>;
}
function ruleDescription(rule: PlanRule) {
  if (rule.kind === "annual") return `${rule.ageAtStart === null ? "本人の年齢" : `対象の開始年齢 ${rule.ageAtStart}歳`} / ${rule.flow === "income" ? "収入" : "支出"} · ${rule.ranges.map(range => `${ageSpan(range.from, range.to)} ${yen(range.amount)}/年`).join(" · ")}`;
  if (rule.kind === "investment") return `${ageSpan(rule.from, rule.to)}に月${yen(rule.monthly)}積立 · 想定年率${rule.rate}%${rule.initial ? ` · 開始非現金資産${yen(rule.initial)}` : ""}`;
  return `${rule.ageAtStart === null ? "本人" : `開始${rule.ageAtStart}歳の対象`}が${rule.age}歳の年に ${yen(rule.amount)}`;
}

export default function CashFlowPage() {
  const [plan, setPlan] = useState<CashPlan>(defaultCashPlan);
  const [savedKey, setSavedKey] = useState("");
  const [baseline, setBaseline] = useState({ monthly: 0, months: 0 });
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [saving, setSaving] = useState(false), [retry, setRetry] = useState(0);
  const [editor, setEditor] = useState<PlanRule | null>(null);
  const [kind, setKind] = useState<PlanRule["kind"]>("annual");
  const [otherAge, setOtherAge] = useState(true);
  const [ranges, setRanges] = useState<RangeDraft[]>([]);
  const [editorKey, setEditorKey] = useState(0), [editorError, setEditorError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError("");
      try {
        const [settings, ledger] = await Promise.all([fetch("/api/cash-flow/plan", { signal: controller.signal, cache: "no-store" }), fetch(`/api/cash-flow?month=${japanToday().slice(0, 7)}&memberId=all`, { signal: controller.signal, cache: "no-store" })]);
        const [settingsData, ledgerData] = await Promise.all([settings.json(), ledger.json()]);
        if (!settings.ok || !ledger.ok) throw new Error(settingsData.error || ledgerData.error || "読み込めませんでした。");
        const loaded = parseCashPlan(settingsData.plan);
        setPlan(loaded); setSavedKey(JSON.stringify(loaded));
        setBaseline({ monthly: ledgerData.outlook.averageNet, months: ledgerData.outlook.baseline.length });
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "読み込めませんでした。"); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [retry]);
  const result = useMemo(() => {
    try { return { points: simulateCashPlan(parseCashPlan(plan), baseline.monthly), error: "" }; }
    catch (e) { return { points: [], error: e instanceof Error ? e.message : "設定を確認してください。" }; }
  }, [plan, baseline]);
  const hasInvestments = plan.initialOtherAssets > 0 || plan.rules.some(rule => rule.kind === "investment");
  const shortfall = result.points.find(point => point.cash < 0);
  const dirty = savedKey !== JSON.stringify(plan);
  async function save(next: CashPlan) {
    if (saving) return false;
    setSaving(true);
    try {
      const validated = parseCashPlan(next);
      const response = await fetch("/api/cash-flow/plan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validated) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存できませんでした。");
      const stored = parseCashPlan(data.plan); setPlan(stored); setSavedKey(JSON.stringify(stored));
      toast.success("シミュレーション設定を保存しました"); return true;
    } catch (e) { const message = e instanceof Error ? e.message : "保存できませんでした。"; toast.error(message); setEditorError(message); return false; }
    finally { setSaving(false); }
  }
  function openEditor(rule: PlanRule | null = null) {
    setEditor(rule); setKind(rule?.kind ?? "annual"); setEditorError(""); setEditorKey(value => value + 1);
    setOtherAge(rule && rule.kind !== "investment" ? rule.ageAtStart !== null : true);
    setRanges(rule?.kind === "annual" ? rule.ranges.map(range => ({ from: String(range.from), to: range.to === null ? "" : String(range.to), amount: String(range.amount) })) : [{ from: "0", to: "5", amount: "0" }, { from: "6", to: "", amount: "0" }]);
    dialog.current?.showModal();
  }
  async function submitRule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setEditorError("");
    const form = new FormData(e.currentTarget), number = (name: string) => Number(form.get(name));
    const optional = (name: string) => form.get(name) === "" ? null : number(name);
    const base = { id: editor?.id ?? crypto.randomUUID(), name: String(form.get("name") ?? "") };
    let rule: PlanRule;
    if (kind === "annual") rule = { ...base, kind, ageAtStart: otherAge ? number("ageAtStart") : null, flow: form.get("flow") === "income" ? "income" : "expense", ranges: ranges.map(range => ({ from: Number(range.from), to: range.to === "" ? null : Number(range.to), amount: Number(range.amount) })) };
    else if (kind === "investment") rule = { ...base, kind, from: number("from"), to: optional("to"), monthly: number("monthly"), rate: number("rate"), initial: number("initial") };
    else rule = { ...base, kind, ageAtStart: otherAge ? number("ageAtStart") : null, age: number("age"), amount: number("amount") };
    const next = { ...plan, rules: editor ? plan.rules.map(item => item.id === editor.id ? rule : item) : [...plan.rules, rule] };
    if (await save(next)) dialog.current?.close();
  }
  async function removeRule(rule: PlanRule) {
    if (!window.confirm(`「${rule.name}」のルールを削除しますか？`)) return;
    await save({ ...plan, rules: plan.rules.filter(item => item.id !== rule.id) });
  }
  return <div className="mx-auto max-w-4xl space-y-4">
    <h1 className="text-xl font-bold">キャッシュフロー</h1>
    {loading ? <div className={`${card} py-14 text-center text-sm text-muted-foreground`} role="status">読み込み中…</div> : error ? <div className={card} role="alert"><p className="text-sm text-destructive">{error}</p><button className={`${primary} mt-4`} onClick={() => setRetry(value => value + 1)}>再読み込み</button></div> : <>
      <section className={card} aria-labelledby="forecast-title"><div className="flex flex-wrap items-center justify-between gap-2"><h2 id="forecast-title" className="text-base font-semibold">今後の見通し</h2><span className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">年単位のシミュレーション</span></div>
        <div className="mt-4 h-80 w-full min-w-0" role="img" aria-label="年齢別の現預金・非現金資産・合計資産の見通しグラフ">
          {result.error ? <p className="py-20 text-center text-sm text-destructive" role="alert">{result.error}</p> : !result.points.length ? <p className="py-24 text-center text-sm text-muted-foreground">下の基本設定で開始年齢を入力してください。</p> : <ResponsiveContainer width="100%" height="100%"><LineChart data={result.points} margin={{ top: 12, right: 12, left: -6, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e2e8ed" /><XAxis dataKey="label" minTickGap={30} tick={{ fontSize: 10 }} /><YAxis width={60} tickFormatter={value => `${Number(value) < 0 ? "−" : ""}${formatShortAmount(Number(value))}`} tick={{ fontSize: 10 }} /><Tooltip content={<ChartTip />} /><ReferenceLine y={0} stroke="#ad3929" strokeDasharray="3 3" />{hasInvestments && <Line dataKey="cash" name="現預金" stroke="#245f8b" dot={false} strokeWidth={2} isAnimationActive={false} />}{hasInvestments && <Line dataKey="investment" name="非現金資産" stroke="#96651a" dot={false} strokeWidth={2} isAnimationActive={false} />}<Line dataKey="total" name="資産合計" stroke="#3f6f51" dot={false} strokeWidth={2.5} isAnimationActive={false} /></LineChart></ResponsiveContainer>}
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-[11px]"><span className="text-[#3f6f51]">● 資産合計</span>{hasInvestments && <><span className="text-[#245f8b]">● 現預金</span><span className="text-[#96651a]">● 非現金資産</span></>}</div><p className="mt-3 text-[10px] leading-5 text-muted-foreground">各年齢の1年間を反映。積立は月末・想定年率を月換算して複利計算します。</p>
        {shortfall && <p className="mt-3 rounded-lg bg-[#f7efec] px-3 py-2 text-xs text-destructive">{shortfall.label === "開始時" ? "開始時" : `${shortfall.age}歳の年`}に現預金が不足する試算です。</p>}
      </section>
      <section className={card}><div className="mb-4 flex items-center justify-between"><h2 className="text-base font-semibold">基本設定</h2><span className="text-[10px] text-muted-foreground">{dirty ? "未保存の変更" : "保存済み"}</span></div><form onSubmit={e => { e.preventDefault(); void save(plan); }}><fieldset disabled={saving} className="space-y-4"><div className="grid grid-cols-2 gap-3"><label className="text-sm">開始年齢（本人）<input type="number" min="0" max="120" required value={plan.startAge ?? ""} onChange={e => setPlan({ ...plan, startAge: e.target.value === "" ? null : Number(e.target.value) })} className={input} /></label><label className="text-sm">終了年齢<input type="number" min="0" max="120" required value={plan.endAge} onChange={e => setPlan({ ...plan, endAge: Number(e.target.value) })} className={input} /></label></div><label className="block text-sm">現在の現預金（円）<input type="number" min="0" max="1000000000000" required value={plan.initialCash} onChange={e => setPlan({ ...plan, initialCash: Number(e.target.value) })} className={input} /></label>
        <div className="space-y-3 rounded-xl border border-border bg-background p-3"><h3 className="text-sm font-semibold">現在の非現金資産の残高</h3>
          {plan.rules.filter(rule => rule.kind === "investment").map(rule => rule.kind === "investment" && <label key={rule.id} className="block text-sm">{rule.name}の現在残高（円）<input type="number" min="0" max="1000000000000" required value={rule.initial} onChange={e => setPlan({ ...plan, rules: plan.rules.map(item => item.id === rule.id ? { ...rule, initial: Number(e.target.value) } : item) })} className={input} /><span className="mt-1 block text-[10px] text-muted-foreground">この残高に想定年率 {rule.rate}% を適用します。</span></label>)}
          <label className="block text-sm">その他の非現金資産（円）<input type="number" min="0" max="1000000000000" required value={plan.initialOtherAssets} onChange={e => setPlan({ ...plan, initialOtherAssets: Number(e.target.value) })} className={input} /></label>
          <p className="text-[11px] leading-5 text-muted-foreground">上の積立ルールに含めていない資産のみ入力してください。その他の資産は残高を一定として計算します。利回りを設定する投資は積立ルールを追加してください。</p>
        </div>
        <p className="text-[11px] text-muted-foreground">残高を変更するとグラフにすぐ反映されます。再訪時にも使うには基本設定を保存してください。</p>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={plan.monthlyNet === null} onChange={e => setPlan({ ...plan, monthlyNet: e.target.checked ? null : baseline.monthly })} className="mt-1" />家族全員の家計簿平均を基本収支に使う</label>
        {plan.monthlyNet === null ? <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">月額 {yen(baseline.monthly)}{baseline.months ? `（過去${baseline.months}か月の実績平均）` : "（過去実績なし・0円）"}</p> : <label className="block text-sm">毎月の基本収支（円）<input type="number" required min="-100000000" max="100000000" value={plan.monthlyNet} onChange={e => setPlan({ ...plan, monthlyNet: Number(e.target.value) })} className={input} /><span className="mt-1 block text-[10px] text-muted-foreground">収入から生活費を引いた金額。赤字はマイナスで入力。</span></label>}
        <p className="text-[11px] text-muted-foreground">ルールの収入・支出は基本収支に加算します。積立額は現預金から非現金資産へ移します。</p><button className={primary}>{saving ? "保存中…" : "基本設定を保存"}</button></fieldset></form></section>
      <section className={card}><div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold">シミュレーションのルール</h2><button type="button" disabled={saving} className={primary} onClick={() => openEditor()}><Plus className="h-4 w-4" />追加</button></div>
        {!plan.rules.length && <p className="py-8 text-center text-xs leading-6 text-muted-foreground">教育費の年齢区分、積立NISAの想定利回り、旅行などの支出を設定できます。</p>}
        <div className="mt-4 divide-y divide-border">{plan.rules.map(rule => <article key={rule.id} className="flex items-start justify-between gap-2 py-4"><div className="min-w-0"><h3 className="break-words text-sm font-semibold">{rule.name}</h3><p className="mt-2 break-words text-xs leading-6 text-muted-foreground">{ruleDescription(rule)}</p></div><div className="flex shrink-0"><button type="button" disabled={saving} aria-label={`${rule.name}を編集`} className="rounded-lg p-2.5 text-muted-foreground hover:bg-muted" onClick={() => openEditor(rule)}><Pencil className="h-4 w-4" /></button><button type="button" disabled={saving} aria-label={`${rule.name}を削除`} className="rounded-lg p-2.5 text-muted-foreground hover:bg-muted hover:text-destructive" onClick={() => void removeRule(rule)}><Trash2 className="h-4 w-4" /></button></div></article>)}</div>
      </section>
    </>}
    <dialog ref={dialog} aria-labelledby="rule-title" onCancel={e => { if (saving) e.preventDefault(); }} className="m-auto max-h-[90dvh] w-[calc(100%_-_24px)] max-w-lg overflow-y-auto rounded-2xl bg-white p-5 text-foreground shadow-xl backdrop:bg-black/40 sm:p-7"><div className="mb-5 flex items-center justify-between"><h2 id="rule-title" className="text-lg font-bold">{editor ? "ルールを編集" : "ルールを追加"}</h2><button disabled={saving} aria-label="閉じる" onClick={() => dialog.current?.close()}><X className="h-5 w-5" /></button></div>
      <label className="block text-sm">種類<select value={kind} disabled={saving || editor !== null} onChange={e => { setKind(e.target.value as PlanRule["kind"]); setOtherAge(e.target.value === "annual"); }} className={input}><option value="annual">年齢別の収入・支出（教育費など）</option><option value="investment">積立・NISA</option><option value="event">単発の支出（旅行など）</option></select></label>
      <form key={`${editorKey}-${kind}`} onSubmit={submitRule} className="mt-4 space-y-4"><fieldset disabled={saving} className="space-y-4"><label className="block text-sm">ルール名<input name="name" required maxLength={80} defaultValue={editor?.name ?? (kind === "annual" ? "教育費" : kind === "investment" ? "積立NISA" : "旅行")} className={input} /></label>
        {kind !== "investment" && <><label className="block text-sm">年齢の基準<select value={otherAge ? "other" : "self"} onChange={e => setOtherAge(e.target.value === "other")} className={input}><option value="self">本人の年齢</option><option value="other">別の人（子どもなど）の年齢</option></select></label>{otherAge && <label className="block text-sm">対象の開始年齢<input name="ageAtStart" type="number" required min="0" max="120" defaultValue={editor && editor.kind !== "investment" ? editor.ageAtStart ?? "" : ""} className={input} /></label>}</>}
        {kind === "annual" && <><label className="block text-sm">収入・支出<select name="flow" defaultValue={editor?.kind === "annual" ? editor.flow : "expense"} className={input}><option value="expense">支出</option><option value="income">収入</option></select></label><div className="space-y-3">{ranges.map((range, i) => <div key={i} className="rounded-xl border border-border bg-background p-3"><div className="grid grid-cols-2 gap-2"><label className="text-xs">開始年齢<input type="number" required min="0" max="120" value={range.from} onChange={e => setRanges(ranges.map((r, j) => j === i ? { ...r, from: e.target.value } : r))} className={input} /></label><label className="text-xs">終了年齢(任意)<input type="number" min="0" max="120" placeholder="以降ずっと" value={range.to} onChange={e => setRanges(ranges.map((r, j) => j === i ? { ...r, to: e.target.value } : r))} className={input} /></label></div><label className="mt-3 block text-xs">年額（円）<input type="number" required min="0" max="1000000000000" value={range.amount} onChange={e => setRanges(ranges.map((r, j) => j === i ? { ...r, amount: e.target.value } : r))} className={input} /></label>{ranges.length > 1 && <button type="button" onClick={() => setRanges(ranges.filter((_, j) => j !== i))} className="mt-2 text-xs text-destructive">この区分を削除</button>}</div>)}</div><button type="button" onClick={() => setRanges([...ranges, { from: "", to: "", amount: "0" }])} className="text-sm font-semibold text-primary">＋ 年齢区分を追加</button></>}
        {kind === "investment" && <><div className="grid grid-cols-2 gap-3"><label className="text-sm">積立開始年齢<input name="from" type="number" required min="0" max="120" defaultValue={editor?.kind === "investment" ? editor.from : plan.startAge ?? 0} className={input} /></label><label className="text-sm">積立終了年齢(任意)<input name="to" type="number" min="0" max="120" placeholder="以降ずっと" defaultValue={editor?.kind === "investment" ? editor.to ?? "" : ""} className={input} /></label></div><label className="block text-sm">毎月の積立額（円）<input name="monthly" type="number" required min="0" max="100000000" defaultValue={editor?.kind === "investment" ? editor.monthly : 0} className={input} /></label><label className="block text-sm">想定利回り（年率%）<input name="rate" type="number" required min="-99" max="100" step="any" defaultValue={editor?.kind === "investment" ? editor.rate : 0} className={input} /></label><label className="block text-sm">現在の投資残高（円）(任意)<input name="initial" type="number" min="0" max="1000000000000" defaultValue={editor?.kind === "investment" ? editor.initial : 0} className={input} /></label><p className="text-[11px] leading-5 text-muted-foreground">積立終了後も想定利回りで運用を続けます。税・手数料は計算に含めません。</p></>}
        {kind === "event" && <><label className="block text-sm">何歳のときに使うか<input name="age" type="number" required min="0" max="120" defaultValue={editor?.kind === "event" ? editor.age : plan.startAge ?? ""} className={input} /></label><label className="block text-sm">金額（円）<input name="amount" type="number" required min="0" max="1000000000000" defaultValue={editor?.kind === "event" ? editor.amount : ""} placeholder="例：1000000" className={input} /></label></>}
      </fieldset>{editorError && <p className="text-sm text-destructive" role="alert">{editorError}</p>}<div className="flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => dialog.current?.close()} className="rounded-lg border border-border px-4 py-2 text-sm">キャンセル</button><button className={primary} disabled={saving}>{saving ? "保存中…" : "保存する"}</button></div></form>
    </dialog>
  </div>;
}
