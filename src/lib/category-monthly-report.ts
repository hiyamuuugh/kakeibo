export interface ReportMonth {
  month: string;
  total: number;
  count: number;
  categories: { id: string; name: string; total: number }[];
}
export function categoryChange(current: number, previous: number) {
  return { amount: current - previous, percent: previous > 0 ? Math.round((current - previous) / previous * 1000) / 10 : null };
}
export function buildCategoryMonthlyReport(current: ReportMonth, previous: ReportMonth[]) {
  const history = previous.filter(month => month.count > 0);
  const last = previous[previous.length - 1];
  const previousMonth = last && last.count > 0 ? last : null;
  const categories = new Map<string, { id: string; name: string }>();
  for (const month of [...history, current]) for (const row of month.categories) categories.set(row.id, { id: row.id, name: row.name });
  const rows = [...categories.values()].map(category => {
    const amount = current.categories.find(row => row.id === category.id)?.total ?? 0;
    const prev = previousMonth ? previousMonth.categories.find(row => row.id === category.id)?.total ?? 0 : null;
    const average = history.length ? Math.round(history.reduce((sum, month) => sum + (month.categories.find(row => row.id === category.id)?.total ?? 0), 0) / history.length) : null;
    return { ...category, amount, share: current.total > 0 ? Math.round(amount / current.total * 1000) / 10 : 0, previous: prev, change: prev === null ? null : categoryChange(amount, prev), average, averageChange: average === null ? null : categoryChange(amount, average) };
  }).sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "ja"));
  const increases = rows.filter(row => row.change && row.change.amount > 0).sort((a, b) => b.change!.amount - a.change!.amount);
  const decreases = rows.filter(row => row.change && row.change.amount < 0).sort((a, b) => a.change!.amount - b.change!.amount);
  return { rows, historyMonths: history.map(month => month.month), previousMonth: previousMonth?.month ?? null, biggestIncrease: current.count ? increases[0] ?? null : null, biggestDecrease: current.count ? decreases[0] ?? null : null, uncategorized: current.categories.filter(row => row.name === "未分類").reduce((sum, row) => sum + row.total, 0) };
}
