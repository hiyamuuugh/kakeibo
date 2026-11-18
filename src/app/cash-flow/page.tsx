"use client";
import { fetchReference } from "@/lib/reference-fetch";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { defaultCashPlan, parseCashPlan, simulateCashPlan, cashRuleTemplate, ruleTemplates, planStartYear, type CashPlan, type PlanRule } from "@/lib/cash-flow-plan";
import { learnCashFlowPrediction, simulateLearnedCashPlan } from "@/lib/cash-flow-prediction";
import type { CashFlowHistory } from "@/lib/cash-flow-history";
import { japanToday } from "@/lib/cash-flow";
import { resolveCurrentCashPlan, type AgeProfile } from "@/lib/profile-age";
import { CashFlowCalculation } from "@/components/cash-flow-calculation";
import { CashFlowPredictionForm } from "@/components/cash-flow-prediction-form";
import { CashFlowYearComparison } from "@/components/cash-flow-year-comparison";
import dynamic from "next/dynamic";
const CashFlowForecastChart = dynamic(() => import("@/components/cash-flow-forecast-chart").then(module => module.CashFlowForecastChart), { ssr: false, loading: () => <div className="h-96 animate-pulse rounded-lg bg-muted" aria-label="グラフを読み込み中" /> });

const card = "rounded-2xl border border-border bg-white p-4 sm:p-6";
const input = "mt-1.5 w-full min-w-0 rounded-lg border border-border bg-white px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-ring";
const primary = "inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50";
const yen = (value: number) => `${value < 0 ? "−" : ""}¥${Math.abs(value).toLocaleString("ja-JP")}`;
const toYen = (man: number) => Math.round(man * 10000);
const ageSpan = (from: number, to: number | null) => to === null ? `${from}歳以降` : `${from}〜${to}歳`;
function NumberField({ value, onChange, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { value: number | string }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(current => current === String(value) || (current !== "" && Number(current) === Number(value)) || (current === "" && value === 0) ? current : String(value)); }, [value]);
  return <input {...props} type="number" value={text} onChange={e => { setText(e.target.value); onChange?.(e); }} />;
}
type RangeDraft = { from: string; to: string; amount: string };
function ruleDescription(rule: PlanRule) {
  const span = (from: number, to: number | null) => rule.basis === "year" ? to === null ? `${from}年以降` : `${from}〜${to}年` : ageSpan(from, to);
  if (rule.kind === "annual") return `${rule.basis === "year" ? "西暦" : rule.ageAtStart === null ? "本人の年齢" : `対象の開始年齢 ${rule.ageAtStart}歳`} / ${rule.flow === "income" ? "収入" : "支出"} · ${rule.ranges.map(range => `${span(range.from, range.to)} ${yen(range.amount)}/${rule.frequency === "monthly" ? "月" : "年"}`).join(" · ")}`;
  if (rule.kind === "investment") return `${span(rule.from, rule.to)}に月${yen(rule.monthly)}積立 · 想定年率${rule.rate}%${rule.initial ? ` · 開始非現金資産${yen(rule.initial)}` : ""}`;
  return rule.basis === "year" ? `${rule.age}年に ${yen(rule.amount)}` : `${rule.ageAtStart === null ? "本人" : `開始${rule.ageAtStart}歳の対象`}が${rule.age}歳の年に ${yen(rule.amount)}`;
}

export default function CashFlowPage() {
  const [storedPlan, setPlan] = useState<CashPlan>(defaultCashPlan);
  const [members, setMembers] = useState<AgeProfile[]>([]);
  const [today, setToday] = useState(japanToday);
  const profile = useMemo(() => resolveCurrentCashPlan(storedPlan, members, today), [storedPlan, members, today]);
  const plan = profile.plan;
  useEffect(() => {
    const refreshDate = () => setToday(japanToday());
    const timer = window.setInterval(refreshDate, 60000);
    window.addEventListener("focus", refreshDate);
    document.addEventListener("visibilitychange", refreshDate);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refreshDate); document.removeEventListener("visibilitychange", refreshDate); };
  }, []);
  const [predictionDirty, setPredictionDirty] = useState(false);
  const [templateKey, setTemplateKey] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savedKey, setSavedKey] = useState("");
  const [history, setHistory] = useState<CashFlowHistory | null>(null);
  const baseline = { monthly: history?.averageNet ?? 0, months: history?.months.length ?? 0 };
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [saving, setSaving] = useState(false), [retry, setRetry] = useState(0);
  const [editor, setEditor] = useState<PlanRule | null>(null);
  const [template, setTemplate] = useState<PlanRule | null>(null);
  const defaults = editor ?? template;
  const [frequency, setFrequency] = useState("yearly");
  const [kind, setKind] = useState<PlanRule["kind"]>("annual");
  const [pointAt, setPointAt] = useState("0"), [investFrom, setInvestFrom] = useState("0"), [investTo, setInvestTo] = useState("");
  const [otherStartAge, setOtherStartAge] = useState("");
  const [basis, setBasis] = useState<"self" | "other" | "year">("other");
  const [ranges, setRanges] = useState<RangeDraft[]>([]);
  const [editorKey, setEditorKey] = useState(0), [editorError, setEditorError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError("");
      try {
        const [settings, ledger, profiles] = await Promise.all([fetch("/api/cash-flow/plan", { signal: controller.signal, cache: "no-store" }), fetch("/api/cash-flow/history", { signal: controller.signal, cache: "no-store" }), fetchReference("/api/members", { signal: controller.signal, cache: "no-store" })]);
        const [settingsData, ledgerData, profileData] = await Promise.all([settings.json(), ledger.json(), profiles.json()]);
        if (!settings.ok || !ledger.ok || !profiles.ok) throw new Error(settingsData.error || ledgerData.error || "読み込めませんでした。");
        const loaded = parseCashPlan(settingsData.plan);
        setPlan(loaded); setSavedKey(JSON.stringify(loaded));
        setHistory(ledgerData.history); setMembers(profileData); setToday(japanToday());
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "読み込めませんでした。"); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [retry]);
  const result = useMemo(() => {
    try { return { points: simulateCashPlan(parseCashPlan(plan), baseline.monthly), error: "" }; }
    catch (e) { return { points: [], error: e instanceof Error ? e.message : "設定を確認してください。" }; }
  }, [plan, baseline.monthly]);
  const prediction = useMemo(() => history ? learnCashFlowPrediction(history, plan.predictionSettings) : null, [history, plan.predictionSettings]);
  const learned = useMemo(() => {
    try { return { points: prediction ? simulateLearnedCashPlan(parseCashPlan(plan), prediction) : [], error: "" }; }
    catch (e) { return { points: [], error: e instanceof Error ? e.message : "予測設定を確認してください。" }; }
  }, [plan, prediction]);
  const hasInvestments = plan.initialOtherAssets > 0 || plan.rules.some(rule => rule.kind === "investment");
  const shortfall = result.points.find(point => point.cash < 0);
  const dirty = savedKey !== JSON.stringify(storedPlan);
  useEffect(() => {
    if (loading || error || saving || dirty || predictionDirty) return;
    let cancelled = false;
    async function refreshSharedPlan() {
      if (document.visibilityState !== "visible" || dialog.current?.open) return;
      try {
        const [response, profiles] = await Promise.all([fetch("/api/cash-flow/plan", { cache: "no-store" }), fetchReference("/api/members", { cache: "no-store" })]);
        if (!response.ok || !profiles.ok) return;
        const [data, profileData] = await Promise.all([response.json(), profiles.json()]);
        if (cancelled || dialog.current?.open) return;
        const shared = parseCashPlan(data.plan);
        setPlan(shared); setSavedKey(JSON.stringify(shared)); setMembers(profileData); setToday(japanToday());
      } catch { /* Keep the displayed plan if a background refresh fails. */ }
    }
    const timer = window.setInterval(() => void refreshSharedPlan(), 15000);
    window.addEventListener("focus", refreshSharedPlan);
    document.addEventListener("visibilitychange", refreshSharedPlan);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener("focus", refreshSharedPlan); document.removeEventListener("visibilitychange", refreshSharedPlan); };
  }, [loading, error, saving, dirty, editorKey, predictionDirty]);
  async function save(next: CashPlan) {
    if (saving) return false;
    setSaving(true);
    try {
      const validated = parseCashPlan(resolveCurrentCashPlan(next, members, japanToday()).plan);
      const response = await fetch("/api/cash-flow/plan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validated) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存できませんでした。");
      const stored = parseCashPlan(data.plan); setPlan(stored); setSavedKey(JSON.stringify(stored));
      toast.success("シミュレーション設定を保存しました"); return true;
    } catch (e) { const message = e instanceof Error ? e.message : "保存できませんでした。"; toast.error(message); setEditorError(message); return false; }
    finally { setSaving(false); }
  }
  function openEditor(rule: PlanRule | null = null, preset: PlanRule | null = null, key = "") {
    setTemplateKey(key);
    setOtherStartAge(rule && rule.kind !== "investment" && rule.ageAtStart !== null ? String(rule.ageAtStart) : preset && preset.kind !== "investment" && preset.ageAtStart !== null ? String(preset.ageAtStart) : "");
    const seed = rule ?? preset;
    setPointAt(String(seed?.kind === "event" ? seed.age : plan.startAge ?? 0));
    setInvestFrom(String(seed?.kind === "investment" ? seed.from : plan.startAge ?? 0));
    setInvestTo(seed?.kind === "investment" && seed.to !== null ? String(seed.to) : "");
    setTemplate(preset); setFrequency(seed?.kind === "annual" ? seed.frequency ?? "yearly" : "yearly");
    setEditor(rule); setKind(seed?.kind ?? "annual"); setEditorError(""); setEditorKey(value => value + 1);
    setBasis(seed?.basis === "year" ? "year" : seed && seed.kind !== "investment" ? seed.ageAtStart !== null ? "other" : "self" : seed ? "self" : "other");
    setRanges(seed?.kind === "annual" ? seed.ranges.map(range => ({ from: String(range.from), to: range.to === null ? "" : String(range.to), amount: String(range.amount / 10000) })) : [{ from: "0", to: "", amount: "0" }]);
    dialog.current?.showModal();
  }
  function convertCoordinate(value: number, from: "self" | "other" | "year", to: "self" | "other" | "year") {
    const other = Number(otherStartAge);
    const origin = (type: "self" | "other" | "year") => type === "year" ? planStartYear(plan) : type === "self" ? plan.startAge ?? 0 : other;
    return value - origin(from) + origin(to);
  }
  function changeBasis(next: "self" | "other" | "year") {
    setRanges(current => current.map(range => ({ ...range, from: range.from === "" ? "" : String(convertCoordinate(Number(range.from), basis, next)), to: range.to === "" ? "" : String(convertCoordinate(Number(range.to), basis, next)) })));
    const convert = (value: string) => value === "" ? "" : String(convertCoordinate(Number(value), basis, next));
    setPointAt(convert); setInvestFrom(convert); setInvestTo(convert);
    setBasis(next);
  }
  async function submitRule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setEditorError("");
    const form = new FormData(e.currentTarget), number = (name: string) => Number(form.get(name));
    const optional = (name: string) => form.get(name) === "" ? null : number(name);
    const base = { id: editor?.id ?? crypto.randomUUID(), name: String(form.get("name") ?? ""), ...(basis === "year" ? { basis: "year" as const } : {}) };
    let rule: PlanRule;
    if (kind === "annual") rule = { ...base, kind, ageAtStart: basis === "other" ? number("ageAtStart") : null, flow: form.get("flow") === "income" ? "income" : "expense", frequency: frequency as "monthly" | "yearly", ranges: ranges.map(range => ({ from: Number(range.from), to: range.to === "" ? null : Number(range.to), amount: toYen(Number(range.amount)) })) };
    else if (kind === "investment") rule = { ...base, kind, from: number("from"), to: optional("to"), monthly: toYen(number("monthly")), rate: number("rate"), initial: toYen(number("initial")) };
    else rule = { ...base, kind, ageAtStart: basis === "other" ? number("ageAtStart") : null, age: number("age"), amount: toYen(number("amount")) };
    const next = { ...plan, startYear: planStartYear(plan), rules: editor ? plan.rules.map(item => item.id === editor.id ? rule : item) : [...plan.rules, rule] };
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
        <CashFlowForecastChart points={result.points} error={result.error} hasInvestments={hasInvestments} predictionPoints={learned.points} predictionError={learned.error} />
        {shortfall && <p className="mt-3 rounded-lg bg-[#f7efec] px-3 py-2 text-xs text-destructive">{shortfall.label === "開始時" ? "開始時" : `${shortfall.age}歳の年`}に現預金が不足する試算です。</p>}
      </section>
      <CashFlowYearComparison points={result.points} predictionPoints={learned.points} />
      <section className={card}><button type="button" aria-expanded={settingsOpen} aria-controls="cash-flow-settings" onClick={() => setSettingsOpen(value => !value)} className="flex w-full items-center justify-between gap-3 text-left"><span className="text-base font-semibold">基本設定</span><span className="ml-auto text-[10px] text-muted-foreground">{dirty ? "未保存の変更" : "保存済み"}</span><ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${settingsOpen ? "rotate-180" : ""}`} /></button><div id="cash-flow-settings" hidden={!settingsOpen} className="mt-4"><form onSubmit={e => { e.preventDefault(); void save(plan); }}><fieldset disabled={saving} className="space-y-4"><div className="grid grid-cols-2 gap-3"><label className="text-sm">現在の年齢（自動）<input type="text" readOnly value={profile.age === null ? "生年月日未登録" : profile.age + "歳"} className={input} /></label><label className="text-sm">終了年齢<NumberField min="0" max="120" required value={plan.endAge} onChange={e => setPlan({ ...plan, endAge: Number(e.target.value) })} className={input} /></label></div><label className="block text-sm">開始年（現在）<input type="text" readOnly value={planStartYear(plan) + "年"} className={input} /></label>
        <label className="block text-sm">基準プロフィール<select aria-label="基準プロフィール" value={profile.member?.id ?? ""} onChange={e => setPlan({ ...plan, referenceMemberId: e.target.value })} className={input}><option value="" disabled>プロフィールを選択</option>{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
        <p className="text-xs leading-5 text-muted-foreground">{profile.age === null ? <><a href="/settings#account-settings" className="font-semibold text-primary underline">設定のアカウント</a>の鉛筆から生年月日を登録してください。</> : <>{profile.member?.name}の生年月日から、{today}時点の満{profile.age}歳を自動計算しています。</>} 来年も、その時点の年齢・現在年から始まります。残高は手入力した金額を使います。</p><label className="block text-sm">現在の現預金（万円）<NumberField min="0" max="100000000" step="0.0001" required value={plan.initialCash / 10000} onChange={e => setPlan({ ...plan, initialCash: toYen(Number(e.target.value)) })} className={input} /></label>
        <div className="space-y-3 rounded-xl border border-border bg-background p-3"><h3 className="text-sm font-semibold">現在の非現金資産の残高</h3>
          {plan.rules.filter(rule => rule.kind === "investment").map(rule => rule.kind === "investment" && <label key={rule.id} className="block text-sm">{rule.name}の現在残高（万円）<NumberField min="0" max="100000000" step="0.0001" required value={rule.initial / 10000} onChange={e => setPlan({ ...plan, rules: plan.rules.map(item => item.id === rule.id ? { ...rule, initial: toYen(Number(e.target.value)) } : item) })} className={input} /><span className="mt-1 block text-[10px] text-muted-foreground">この残高に想定年率 {rule.rate}% を適用します。</span></label>)}
          <label className="block text-sm">その他の非現金資産（万円）<NumberField min="0" max="100000000" step="0.0001" required value={plan.initialOtherAssets / 10000} onChange={e => setPlan({ ...plan, initialOtherAssets: toYen(Number(e.target.value)) })} className={input} /></label>
          <p className="text-[11px] leading-5 text-muted-foreground">上の積立ルールに含めていない資産のみ入力してください。その他の資産は残高を一定として計算します。利回りを設定する投資は積立ルールを追加してください。</p>
        </div>
        <p className="text-[11px] text-muted-foreground">残高を変更するとグラフにすぐ反映されます。再訪時にも使うには基本設定を保存してください。</p>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={plan.monthlyNet === null} onChange={e => setPlan({ ...plan, monthlyNet: e.target.checked ? null : baseline.monthly })} className="mt-1" />家族全員の家計簿平均を基本収支に使う</label>
        {plan.monthlyNet === null ? <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">月額 {yen(baseline.monthly)}{baseline.months ? `（過去${baseline.months}か月の実績平均）` : "（過去実績なし・0円）"}</p> : <label className="block text-sm">毎月の基本収支（万円）<NumberField required min="-10000" max="10000" step="0.0001" value={plan.monthlyNet / 10000} onChange={e => setPlan({ ...plan, monthlyNet: toYen(Number(e.target.value)) })} className={input} /><span className="mt-1 block text-[10px] text-muted-foreground">収入から生活費を引いた金額。赤字はマイナスで入力。</span></label>}
        <p className="text-[11px] text-muted-foreground">ルールの収入・支出は基本収支に加算します。給料・保険料などをルールに含める場合は、基本収支に同じ金額を含めないよう調整してください。積立額は現預金から非現金資産へ移します。</p><button className={primary}>{saving ? "保存中…" : "基本設定を保存"}</button></fieldset></form></div></section>
      <section className={card}><div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold">シミュレーションのルール</h2><button type="button" disabled={saving} className={primary} onClick={() => openEditor()}><Plus className="h-4 w-4" />追加</button></div>
        {!plan.rules.length && <p className="py-8 text-center text-xs leading-6 text-muted-foreground">給料・保険料・教育費・積立NISA・住宅や車の購入などを設定できます。</p>}
        <div className="mt-4 divide-y divide-border">{plan.rules.map(rule => <article key={rule.id} className="flex items-start justify-between gap-2 py-4"><div className="min-w-0"><h3 className="break-words text-sm font-semibold">{rule.name}</h3><p className="mt-2 break-words text-xs leading-6 text-muted-foreground">{ruleDescription(rule)}</p></div><div className="flex shrink-0"><button type="button" disabled={saving} aria-label={`${rule.name}を編集`} className="rounded-lg p-2.5 text-muted-foreground hover:bg-muted" onClick={() => openEditor(rule)}><Pencil className="h-4 w-4" /></button><button type="button" disabled={saving} aria-label={`${rule.name}を削除`} className="rounded-lg p-2.5 text-muted-foreground hover:bg-muted hover:text-destructive" onClick={() => void removeRule(rule)}><Trash2 className="h-4 w-4" /></button></div></article>)}</div>
      </section>
      <CashFlowPredictionForm settings={plan.predictionSettings} saving={saving} onEditingChange={setPredictionDirty} onSave={settings => save({ ...plan, predictionSettings: settings })} />
      {history && <CashFlowCalculation history={history} monthlyNet={plan.monthlyNet} prediction={prediction} />}
    </>}
    <dialog ref={dialog} aria-labelledby="rule-title" onCancel={e => { if (saving) e.preventDefault(); }} className="m-auto max-h-[90dvh] w-[calc(100%_-_24px)] max-w-lg overflow-y-auto rounded-2xl bg-white p-5 text-foreground shadow-xl backdrop:bg-black/40 sm:p-7"><div className="mb-5 flex items-center justify-between"><h2 id="rule-title" className="text-lg font-bold">{editor ? "ルールを編集" : "ルールを追加"}</h2><button disabled={saving} aria-label="閉じる" onClick={() => dialog.current?.close()}><X className="h-5 w-5" /></button></div>
      {!editor && <label className="mb-4 block text-sm">テンプレート<select aria-label="テンプレート" value={templateKey} disabled={saving} onChange={e => { if (e.target.value) openEditor(null, cashRuleTemplate(e.target.value, plan.startAge), e.target.value); else openEditor(); }} className={input}><option value="">一覧から選択</option>{ruleTemplates.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>}
      <label className="block text-sm">種類<select value={kind} disabled={saving || editor !== null} onChange={e => { setTemplateKey(""); setTemplate(null); setKind(e.target.value as PlanRule["kind"]); setBasis(e.target.value === "annual" ? "other" : "self"); setPointAt(String(plan.startAge ?? 0)); setInvestFrom(String(plan.startAge ?? 0)); setInvestTo(""); }} className={input}><option value="annual">定期的な収入・支出（給料・保険料など）</option><option value="investment">積立・NISA</option><option value="event">単発の支出（住宅・車・旅行など）</option></select></label>
      <form key={`${editorKey}-${kind}`} onSubmit={submitRule} className="mt-4 space-y-4"><fieldset disabled={saving} className="space-y-4"><label className="block text-sm">ルール名<input name="name" required maxLength={80} defaultValue={defaults?.name ?? (kind === "annual" ? "教育費" : kind === "investment" ? "積立NISA" : "旅行")} className={input} /></label>
        <label className="block text-sm">年齢・西暦の基準<select aria-label="年齢・西暦の基準" value={basis} onChange={e => changeBasis(e.target.value as "self" | "other" | "year")} className={input}><option value="self">本人の年齢</option>{kind !== "investment" && <option value="other">別の人（子どもなど）の年齢</option>}<option value="year">西暦</option></select></label>{basis === "other" && <label className="block text-sm">対象の開始年齢<NumberField name="ageAtStart" required min="0" max="120" value={otherStartAge} onChange={e => setOtherStartAge(e.target.value)} className={input} /></label>}
        {kind === "annual" && <><div className="grid grid-cols-2 gap-3"><label className="min-w-0 text-sm">収入・支出<select name="flow" defaultValue={defaults?.kind === "annual" ? defaults.flow : "expense"} className={input}><option value="expense">支出</option><option value="income">収入</option></select></label><label className="block text-sm">金額の単位<select value={frequency} onChange={e => setFrequency(e.target.value)} className={input}><option value="monthly">月額</option><option value="yearly">年額</option></select></label></div><div className="space-y-3">{ranges.map((range, i) => <div key={i} className="rounded-xl border border-border bg-background p-3"><div className="grid grid-cols-2 gap-2"><label className="text-xs">{basis === "year" ? "開始年（西暦）" : "開始年齢"}<NumberField required min={basis === "year" ? 1900 : 0} max={basis === "year" ? 2400 : 120} value={range.from} onChange={e => setRanges(ranges.map((r, j) => j === i ? { ...r, from: e.target.value } : r))} className={input} /></label><label className="text-xs">{basis === "year" ? "終了年（西暦）(任意)" : "終了年齢(任意)"}<NumberField min={basis === "year" ? 1900 : 0} max={basis === "year" ? 2400 : 120} placeholder="以降ずっと" value={range.to} onChange={e => setRanges(ranges.map((r, j) => j === i ? { ...r, to: e.target.value } : r))} className={input} /></label></div><label className="mt-3 block text-xs">{frequency === "monthly" ? "月額（万円）" : "年額（万円）"}<NumberField required min="0" max="100000000" step="0.0001" value={range.amount} onChange={e => setRanges(ranges.map((r, j) => j === i ? { ...r, amount: e.target.value } : r))} className={input} /></label>{ranges.length > 1 && <button type="button" aria-label={`${basis === "year" ? "期間" : "年齢区分"}${i + 1}を削除`} onClick={() => setRanges(ranges.filter((_, j) => j !== i))} className="mt-2 rounded-lg p-2.5 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>}</div>)}</div><button type="button" onClick={() => setRanges([...ranges, { from: "", to: "", amount: "0" }])} className="text-sm font-semibold text-primary">{basis === "year" ? "＋ 期間を追加" : "＋ 年齢区分を追加"}</button></>}
        {kind === "investment" && <><div className="grid grid-cols-2 gap-3"><label className="text-sm">{basis === "year" ? "積立開始年（西暦）" : "積立開始年齢"}<NumberField name="from" required min={basis === "year" ? 1900 : 0} max={basis === "year" ? 2400 : 120} value={investFrom} onChange={e => setInvestFrom(e.target.value)} className={input} /></label><label className="text-sm">{basis === "year" ? "積立終了年（西暦）(任意)" : "積立終了年齢(任意)"}<NumberField name="to" min={basis === "year" ? 1900 : 0} max={basis === "year" ? 2400 : 120} placeholder="以降ずっと" value={investTo} onChange={e => setInvestTo(e.target.value)} className={input} /></label></div><label className="block text-sm">毎月の積立額（万円）<input name="monthly" type="number" required min="0" max="10000" step="0.0001" defaultValue={defaults?.kind === "investment" ? defaults.monthly / 10000 : 0} className={input} /></label><label className="block text-sm">想定利回り（年率%）<input name="rate" type="number" required min="-99" max="100" step="any" defaultValue={defaults?.kind === "investment" ? defaults.rate : 0} className={input} /></label><label className="block text-sm">現在の投資残高（万円）(任意)<input name="initial" type="number" min="0" max="100000000" step="0.0001" defaultValue={defaults?.kind === "investment" ? defaults.initial / 10000 : 0} className={input} /></label><p className="text-[11px] leading-5 text-muted-foreground">積立終了後も想定利回りで運用を続けます。税・手数料は計算に含めません。</p></>}
        {kind === "event" && <><p className="text-[11px] leading-5 text-muted-foreground">住宅・車をローンで購入する場合は、ここには頭金や諸費用を入力し、返済額は「ローン返済」のルールに設定してください。購入後の資産価値や借入残高は自動計算しません。</p><label className="block text-sm">{basis === "year" ? "何年に使うか（西暦）" : "何歳のときに使うか"}<NumberField name="age" required min={basis === "year" ? 1900 : 0} max={basis === "year" ? 2400 : 120} value={pointAt} onChange={e => setPointAt(e.target.value)} className={input} /></label><label className="block text-sm">金額（万円）<input name="amount" type="number" required min="0" max="100000000" step="0.0001" defaultValue={defaults?.kind === "event" ? defaults.amount / 10000 : ""} placeholder="例：100" className={input} /></label></>}
      </fieldset>{editorError && <p className="text-sm text-destructive" role="alert">{editorError}</p>}<div className="flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => dialog.current?.close()} className="rounded-lg border border-border px-4 py-2 text-sm">キャンセル</button><button className={primary} disabled={saving}>{saving ? "保存中…" : "保存する"}</button></div></form>
    </dialog>
  </div>;
}
