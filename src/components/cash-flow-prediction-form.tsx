"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { defaultPredictionSettings, parsePredictionSettings, predictionInstructionText, summarizePredictionSettings, type PredictionSettings } from "@/lib/cash-flow-prediction-settings";
const field = "mt-1.5 w-full min-w-0 rounded-lg border border-border bg-white px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-ring";
export function CashFlowPredictionForm({ settings, saving, onSave, onEditingChange }: { settings?: PredictionSettings; saving: boolean; onSave: (settings: PredictionSettings) => Promise<boolean>; onEditingChange: (editing: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState(""), [dirty, setDirty] = useState(false);
  const key = JSON.stringify(settings ?? defaultPredictionSettings());
  const current = useMemo(() => JSON.parse(key) as PredictionSettings, [key]);
  useEffect(() => { setInstructions(predictionInstructionText(current)); }, [current]);
  const preview = useMemo(() => {
    try {
      const base = instructions.trim() ? current : defaultPredictionSettings();
      return parsePredictionSettings({ ...base, instructions });
    } catch { return null; }
  }, [current, instructions]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    try {
      const base = instructions.trim() ? current : defaultPredictionSettings();
      const parsed = parsePredictionSettings({ ...base, instructions });
      if (await onSave(parsed)) { setInstructions(predictionInstructionText(parsed)); setDirty(false); onEditingChange(false); }
      else setError("保存できませんでした。入力内容を残しているので、もう一度お試しください。");
    } catch (e) { setError(e instanceof Error ? e.message : "指示を確認してください。"); }
  }
  return <section className="rounded-2xl border border-border bg-white p-4 sm:p-6">
    <button type="button" aria-expanded={open} aria-controls="cash-flow-prediction-instructions" onClick={() => setOpen(value => !value)} className="flex w-full items-center justify-between gap-3 text-left"><span className="text-base font-semibold">AI予測への指示</span><span className="ml-auto text-[10px] text-muted-foreground">{dirty ? "未適用の変更" : "適用中"}</span><ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} /></button>
    <div id="cash-flow-prediction-instructions" hidden={!open} className="mt-4">
      <form onSubmit={submit}><fieldset disabled={saving} className="space-y-4">
        <label className="block text-sm">指示文<textarea maxLength={500} rows={4} value={instructions} onChange={e => { setInstructions(e.target.value); setDirty(true); onEditingChange(true); setError(""); }} placeholder="過去12か月を考慮して。支出を10%増やす。" className={field} /><span className="mt-1 block text-[11px] leading-5 text-muted-foreground">対応形式：「過去12か月を考慮して」「収入を5%減らす」「支出を10%増やす」。指定のない項目は現在の設定を引き継ぎます。空欄で適用すると過去24か月・補正なしに戻します。</span></label>
        <div aria-label="指示のまとめ" aria-live="polite" className="rounded-xl bg-background p-3 text-xs leading-6">
          <h3 className="font-semibold">指示のまとめ</h3><p className="text-[11px] text-muted-foreground">{dirty ? "未適用のプレビュー" : "適用中の内容"}</p>
          {preview ? <><ul className="mt-2 list-disc space-y-1 pl-4">{summarizePredictionSettings(preview).map(text => <li key={text}>{text}</li>)}</ul><p className="mt-2 text-[11px] text-muted-foreground">最初の12か月を予測し、その後は予測平均を使います。予測線に反映し、通常試算の実績平均は変えません。</p></> : <p className="mt-2 text-muted-foreground">まだ解釈できない指示があります。対応形式に直してから適用してください。</p>}
        </div>
        <p className="text-[11px] leading-5 text-muted-foreground">指示はアプリ内で設定に変換し、回帰モデルに反映します。対象期間は3〜120か月、収入・支出の補正は−90〜100%です。自由な予定や支出条件はルールに追加してください。</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={saving}>{saving ? "保存中…" : "保存"}</button>
      </fieldset></form>
    </div>
  </section>;
}
