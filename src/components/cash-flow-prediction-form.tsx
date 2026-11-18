"use client";
import { useEffect, useState } from "react";
import { defaultPredictionSettings, parsePredictionSettings, type PredictionSettings } from "@/lib/cash-flow-prediction-settings";
const field = "mt-1.5 w-full min-w-0 rounded-lg border border-border bg-white px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-ring";
export function CashFlowPredictionForm({ settings, saving, onSave, onEditingChange }: { settings?: PredictionSettings; saving: boolean; onSave: (settings: PredictionSettings) => Promise<boolean>; onEditingChange: (editing: boolean) => void }) {
  const [months, setMonths] = useState("24"), [income, setIncome] = useState("0"), [expense, setExpense] = useState("0"), [instructions, setInstructions] = useState("");
  const [error, setError] = useState(""), [dirty, setDirty] = useState(false);
  const key = JSON.stringify(settings ?? defaultPredictionSettings());
  useEffect(() => { const value = JSON.parse(key) as PredictionSettings; setMonths(String(value.lookbackMonths)); setIncome(String(value.incomeChange)); setExpense(String(value.expenseChange)); setInstructions(value.instructions); }, [key]);
  function edit() { setDirty(true); onEditingChange(true); setError(""); }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    try {
      const parsed = parsePredictionSettings({ lookbackMonths: Number(months), incomeChange: Number(income), expenseChange: Number(expense), instructions });
      if (await onSave(parsed)) { setMonths(String(parsed.lookbackMonths)); setIncome(String(parsed.incomeChange)); setExpense(String(parsed.expenseChange)); setDirty(false); onEditingChange(false); }
    } catch (e) { setError(e instanceof Error ? e.message : "指示を確認してください。"); }
  }
  return <section className="rounded-2xl border border-border bg-white p-4 sm:p-6">
    <div className="flex items-center justify-between gap-2"><h2 className="text-base font-semibold">AI予測への指示</h2><span className="text-[10px] text-muted-foreground">{dirty ? "未適用の変更" : "適用中"}</span></div>
    <form onSubmit={submit} className="mt-4"><fieldset disabled={saving} className="space-y-4">
      <label className="block text-sm">考慮する過去の月数<input type="number" min="3" max="120" required value={months} onChange={e => { edit(); setMonths(e.target.value); setInstructions(""); }} className={field} /><span className="mt-1 block text-[11px] text-muted-foreground">今月を除く過去3〜120か月のうち、記録がある月を学習します。</span></label>
      <div className="grid grid-cols-2 gap-3"><label className="min-w-0 text-sm">収入の補正（%）<input type="number" min="-90" max="100" step="any" required value={income} onChange={e => { edit(); setIncome(e.target.value); setInstructions(""); }} className={field} /></label><label className="min-w-0 text-sm">支出の補正（%）<input type="number" min="-90" max="100" step="any" required value={expense} onChange={e => { edit(); setExpense(e.target.value); setInstructions(""); }} className={field} /></label></div>
      <label className="block text-sm">指示文(任意)<textarea maxLength={500} rows={3} value={instructions} onChange={e => { edit(); setInstructions(e.target.value); }} placeholder="過去12か月を考慮して。支出を10%増やす。" className={field} /><span className="mt-1 block text-[11px] leading-5 text-muted-foreground">対応形式：「過去12か月を考慮して」「収入を5%減らす」「支出を10%増やす」。指示文を優先して設定に変換します。自由な予定や支出条件はルールに追加してください。</span></label>
      <p className="text-[11px] leading-5 text-muted-foreground">対象期間と補正は回帰モデルの予測線に反映します。通常試算の実績平均は変更しません。補正は各月の予測額に掛け、2年目以降は補正後の予測平均を使います。</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={saving}>{saving ? "保存中…" : "予測に適用して保存"}</button>
    </fieldset></form>
  </section>;
}
