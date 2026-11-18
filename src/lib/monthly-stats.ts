import { buildCategoryStats } from "./category-stats";
import { monthAt } from "./cash-flow";
export interface StatsTransaction {
  date: Date;
  amount: number;
  categoryId: string | null;
  category: { id: string; name: string; color: string; icon: string } | null;
}
export function buildMonthlyStats(month: string, transactions: StatsTransaction[], includeDaily = true) {
  const expenses = transactions.filter(row => row.amount >= 0), incomes = transactions.filter(row => row.amount < 0);
  const categories = buildCategoryStats(expenses, { fallbackId: "__uncategorized__", fallbackName: "未分類", fallbackColor: "#9ca3af", fallbackIcon: "circle-ellipsis" });
  const incomeCategories = buildCategoryStats(incomes, { fallbackId: "__income_uncategorized__", fallbackName: "未分類", fallbackColor: "#9ca3af", fallbackIcon: "circle-help", useAbsoluteAmount: true, allowedCategoryNames: ["給料", "補助金", "その他", "未分類"] });
  const dailyMap = new Map<string, number>();
  if (includeDaily) for (const row of expenses) { const day = row.date.toISOString().slice(0, 10); dailyMap.set(day, (dailyMap.get(day) ?? 0) + row.amount); }
  return { month, total: expenses.reduce((sum, row) => sum + row.amount, 0), income: incomes.reduce((sum, row) => sum - row.amount, 0), categories, incomeCategories, daily: [...dailyMap].sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount })), count: expenses.length };
}
export function buildMonthlyRange(from: string, to: string, transactions: StatsTransaction[]) {
  const grouped = new Map<string, StatsTransaction[]>();
  for (const row of transactions) { const month = row.date.toISOString().slice(0, 7); if (month < from || month > to) continue; const rows = grouped.get(month) ?? []; rows.push(row); grouped.set(month, rows); }
  const months = [];
  for (let month = from; month <= to; month = monthAt(month, 1)) months.push(buildMonthlyStats(month, grouped.get(month) ?? [], false));
  return months;
}
export type MonthlyStats = ReturnType<typeof buildMonthlyStats>;
export const statsTransactionSelect = { date: true, amount: true, categoryId: true, category: { select: { id: true, name: true, color: true, icon: true } } } as const;
