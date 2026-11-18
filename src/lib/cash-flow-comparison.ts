import type { simulateCashPlan } from "./cash-flow-plan";
export type CashFlowPoint = ReturnType<typeof simulateCashPlan>[number];
export function balanceChange(from: number, to: number) {
  return { difference: to - from, percent: from > 0 ? (to - from) / from * 100 : null };
}
export function comparisonRows(left: CashFlowPoint, right: CashFlowPoint) {
  const rows = [
    { id: "cash", name: "現預金", left: left.cash, right: right.cash },
    { id: "investment", name: "投資残高", left: left.investment - left.otherAssets, right: right.investment - right.otherAssets },
    { id: "other", name: "その他の非現金資産", left: left.otherAssets, right: right.otherAssets },
    { id: "total", name: "資産合計", left: left.total, right: right.total },
  ];
  return rows.map(row => ({ ...row, ...balanceChange(row.left, row.right) }));
}
export function comparisonInvestments(left: CashFlowPoint, right: CashFlowPoint) {
  const ids = [...new Set([...left.investmentBreakdown, ...right.investmentBreakdown].map(item => item.id))];
  return ids.map(id => {
    const a = left.investmentBreakdown.find(item => item.id === id), b = right.investmentBreakdown.find(item => item.id === id);
    const from = a?.balance ?? 0, to = b?.balance ?? 0;
    return { id, name: b?.name ?? a?.name ?? "投資", left: from, right: to, leftPrincipal: a?.principal ?? 0, rightPrincipal: b?.principal ?? 0, leftProfit: a?.profit ?? 0, rightProfit: b?.profit ?? 0, ...balanceChange(from, to) };
  });
}
