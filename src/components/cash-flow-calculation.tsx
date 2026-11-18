"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CashFlowHistory } from "@/lib/cash-flow-history";
import type { CashFlowPrediction } from "@/lib/cash-flow-prediction";
const yen = (amount: number) => amount.toLocaleString("ja-JP") + "円";
export function CashFlowCalculation({ history, monthlyNet, prediction }: { history: CashFlowHistory; monthlyNet: number | null; prediction: CashFlowPrediction | null }) {
  const [open, setOpen] = useState(false);
  return <section className="rounded-2xl border border-border bg-white p-4 sm:p-6" aria-labelledby="calculation-title">
    <button type="button" aria-expanded={open} aria-controls="cash-flow-calculation" onClick={() => setOpen(value => !value)} className="flex w-full items-center justify-between gap-3 text-left"><span id="calculation-title" className="text-base font-semibold">計算の根拠</span><ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} /></button><div id="cash-flow-calculation" hidden={!open} className="mt-4">
    <p className="mt-2 text-xs leading-6 text-muted-foreground">{history.months.length ? `${history.months[0].month}〜${history.months.at(-1)!.month}の記録がある${history.months.length}か月・${history.count}件（家族全員）を集計。` : "今月より前の記録がないため、実績の基本収支は0円です。"}今月は途中のため平均から除き、記録のない月は0円扱いせず計算対象から除きます。</p>
    {history.months.length > 0 && <div className="mt-3 space-y-2 rounded-xl bg-background p-3 text-xs leading-6">
      <p>月平均収入：{yen(history.income)} ÷ {history.months.length}か月 ＝ {yen(history.averageIncome)}</p>
      <p>月平均支出：{yen(history.expense)} ÷ {history.months.length}か月 ＝ {yen(history.averageExpense)}</p>
      <p className="font-semibold">毎月の実績収支：{yen(history.averageIncome)} − {yen(history.averageExpense)} ＝ {yen(history.averageNet)}</p>
    </div>}
    <p className="mt-3 text-sm font-semibold">このグラフの基本収支：月 {yen(monthlyNet ?? history.averageNet)}{monthlyNet === null ? "（実績平均）" : "（手入力）"}</p>
    <div className="mt-4 rounded-xl border border-[#dcd5e3] bg-[#f6f3f8] p-3 text-xs leading-6">
      <h3 className="font-semibold text-[#7a678c]">AI予測の計算根拠（アプリ内の回帰学習）</h3>
      <p className="mt-1">月別の収入・支出の傾向を学習する回帰モデルです。生成AIサービスへの接続やデータ送信は行いません。</p>
      {prediction?.available ? <>
        <p className="mt-2">学習期間：{prediction.months[0].month}〜{prediction.months.at(-1)!.month}・{prediction.months.length}か月（過去{prediction.settings.lookbackMonths}か月を対象）。</p>
        <p>最初の12か月の予測平均：収入 {yen(prediction.averageIncome)} − 支出 {yen(prediction.averageExpense)} ＝ 月 {yen(prediction.averageNet)}。</p>
        <p>最初の12か月は月ごとの予測収支、その後はこの平均を一定として使います。AI線は手入力の基本収支に代わって予測収支を使い、現在の資産残高・積立・年齢別ルールは通常試算と共通です。</p>
        {prediction.months.length < 6 && <p className="mt-1">記録が6か月未満のため、傾向が変わりやすい予測です。</p>}
        <details className="mt-2"><summary className="cursor-pointer font-semibold text-[#7a678c]">学習式・月別の予測を見る</summary><div className="mt-2 space-y-2">
          <p>直近の月を重くする重み付きリッジ回帰を収入と支出に別々に適用します。重みは 2^(今月からの月差 ÷ 12)、傾きは重み付き共分散 ÷ (重み付き分散 ＋ 12 × 重み合計)。切片は重み付き平均額 − 傾き × 重み付き平均月です。</p>
          <p>表示係数は整数円に丸めた概数です。実際の計算は丸める前の係数を使います。今月をt＝0とすると、収入の学習式は {yen(Math.round(prediction.income.intercept))} ＋ {yen(Math.round(prediction.income.slope))} × t。支出は {yen(Math.round(prediction.expense.intercept))} ＋ {yen(Math.round(prediction.expense.slope))} × t。</p>
          <p>各予測額は0円〜学習期間の最大額に収めた後、収入 {prediction.settings.incomeChange}%・支出 {prediction.settings.expenseChange}% の補正を掛け、整数円に丸めます。2年目以降の収支は固定し、物価上昇・昇給・税制・市場利回りの変化は自動で加えません。将来を保証する値ではありません。</p>
          <div className="overflow-auto"><table className="w-full text-left text-[11px]"><caption className="text-left">最初の12か月の予測</caption><thead><tr><th className="p-1">月</th><th className="p-1">収入</th><th className="p-1">支出</th><th className="p-1">収支</th></tr></thead><tbody>{prediction.forecast.map(month => <tr key={month.month}><td className="p-1">{month.month}</td><td className="p-1">{yen(month.income)}</td><td className="p-1">{yen(month.expense)}</td><td className="p-1">{yen(month.net)}</td></tr>)}</tbody></table></div>
        </div></details>
      </> : <p className="mt-2">{prediction?.reason ?? "記録を読み込み中です。"}</p>}
    </div>
    <details className="mt-3 text-xs leading-6"><summary className="cursor-pointer font-semibold text-primary">対象月・計算式を見る</summary><div className="mt-2 space-y-2 text-muted-foreground">
      <p>平均は整数円に四捨五入します。基本収支を各年12回反映し、年齢別ルールの収入・支出、旅行や購入の一時支出を加減します。</p>
      <p>現預金 ＝ 前年末の現預金 ＋ 毎月の基本収支 × 12 ＋ ルールの収入 − ルールの支出 − 積立額。</p>
      <p>投資は毎月、前月残高 × (1 ＋ 年率 ÷ 100)^(1/12) ＋ 月末の積立額。資産合計は現預金・投資・その他の非現金資産の合計です。</p>
      <p>一時的な出費も実績平均に含みます。給与・保険・購入費などを別ルールで追加する場合は、基本収支と重ならないよう調整してください。記録漏れや口座振替・カード支払の重複は自動判定しません。</p>
      {history.months.length > 0 && <div className="max-h-60 overflow-auto rounded-lg border border-border"><table className="w-full text-left text-[11px]"><caption className="p-2 text-left">平均の対象月</caption><thead><tr><th className="p-2">月</th><th className="p-2">収入</th><th className="p-2">支出</th></tr></thead><tbody>{history.months.map(month => <tr key={month.month} className="border-t border-border"><td className="p-2">{month.month}</td><td className="p-2">{yen(month.income)}</td><td className="p-2">{yen(month.expense)}</td></tr>)}</tbody></table></div>}
    </div></details>
    {history.months.length > 0 && history.months.length < 3 && <p className="mt-3 text-xs text-muted-foreground">対象が3か月未満のため、月ごとの変動の影響を受けやすい試算です。</p>}
  </div></section>;
}
