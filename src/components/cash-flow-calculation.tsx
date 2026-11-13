import type { CashFlowHistory } from "@/lib/cash-flow-history";
const yen = (amount: number) => amount.toLocaleString("ja-JP") + "円";
export function CashFlowCalculation({ history, monthlyNet }: { history: CashFlowHistory; monthlyNet: number | null }) {
  return <section className="rounded-2xl border border-border bg-white p-4 sm:p-6" aria-labelledby="calculation-title">
    <h2 id="calculation-title" className="text-base font-semibold">計算の根拠</h2>
    <p className="mt-2 text-xs leading-6 text-muted-foreground">{history.months.length ? `${history.months[0].month}〜${history.months.at(-1)!.month}の記録がある${history.months.length}か月・${history.count}件（家族全員）を集計。` : "今月より前の記録がないため、実績の基本収支は0円です。"}今月は途中のため平均から除き、記録のない月は0円扱いせず計算対象から除きます。</p>
    {history.months.length > 0 && <div className="mt-3 space-y-2 rounded-xl bg-background p-3 text-xs leading-6">
      <p>月平均収入：{yen(history.income)} ÷ {history.months.length}か月 ＝ {yen(history.averageIncome)}</p>
      <p>月平均支出：{yen(history.expense)} ÷ {history.months.length}か月 ＝ {yen(history.averageExpense)}</p>
      <p className="font-semibold">毎月の実績収支：{yen(history.averageIncome)} − {yen(history.averageExpense)} ＝ {yen(history.averageNet)}</p>
    </div>}
    <p className="mt-3 text-sm font-semibold">このグラフの基本収支：月 {yen(monthlyNet ?? history.averageNet)}{monthlyNet === null ? "（実績平均）" : "（手入力）"}</p>
    <details className="mt-3 text-xs leading-6"><summary className="cursor-pointer font-semibold text-primary">対象月・計算式を見る</summary><div className="mt-2 space-y-2 text-muted-foreground">
      <p>平均は整数円に四捨五入します。基本収支を各年12回反映し、年齢別ルールの収入・支出、旅行や購入の一時支出を加減します。</p>
      <p>現預金 ＝ 前年末の現預金 ＋ 毎月の基本収支 × 12 ＋ ルールの収入 − ルールの支出 − 積立額。</p>
      <p>投資は毎月、前月残高 × (1 ＋ 年率 ÷ 100)^(1/12) ＋ 月末の積立額。資産合計は現預金・投資・その他の非現金資産の合計です。</p>
      <p>一時的な出費も実績平均に含みます。給与・保険・購入費などを別ルールで追加する場合は、基本収支と重ならないよう調整してください。記録漏れや口座振替・カード支払の重複は自動判定しません。</p>
      {history.months.length > 0 && <div className="max-h-60 overflow-auto rounded-lg border border-border"><table className="w-full text-left text-[11px]"><caption className="p-2 text-left">平均の対象月</caption><thead><tr><th className="p-2">月</th><th className="p-2">収入</th><th className="p-2">支出</th></tr></thead><tbody>{history.months.map(month => <tr key={month.month} className="border-t border-border"><td className="p-2">{month.month}</td><td className="p-2">{yen(month.income)}</td><td className="p-2">{yen(month.expense)}</td></tr>)}</tbody></table></div>}
    </div></details>
    {history.months.length > 0 && history.months.length < 3 && <p className="mt-3 text-xs text-muted-foreground">対象が3か月未満のため、月ごとの変動の影響を受けやすい試算です。</p>}
  </section>;
}
