export type HistoryEntry = { date: Date | string; amount: number; category?: { name: string } | null };
/** Uses only recorded, completed calendar months; never invents zeroes for missing months. */
export function buildCashFlowHistory(entries: HistoryEntry[], today: string) {
  const currentMonth = today.slice(0, 7);
  const buckets = new Map<string, { month: string; income: number; expense: number; count: number }>();
  const categories = new Map<string, number>();
  let currentMonthCount = 0;
  for (const entry of entries) {
    const day = (entry.date instanceof Date ? entry.date.toISOString() : entry.date).slice(0, 10);
    if (day > today) continue;
    const month = day.slice(0, 7);
    if (month === currentMonth) { currentMonthCount++; continue; }
    if (month > currentMonth) continue;
    const bucket = buckets.get(month) ?? { month, income: 0, expense: 0, count: 0 };
    bucket.income += Math.max(0, -entry.amount); bucket.expense += Math.max(0, entry.amount); bucket.count++;
    buckets.set(month, bucket);
    if (entry.amount > 0) {
      const name = entry.category?.name || "未分類";
      categories.set(name, (categories.get(name) ?? 0) + entry.amount);
    }
  }
  const months = [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month));
  const income = months.reduce((sum, month) => sum + month.income, 0), expense = months.reduce((sum, month) => sum + month.expense, 0);
  const averageIncome = months.length ? Math.round(income / months.length) : 0, averageExpense = months.length ? Math.round(expense / months.length) : 0;
  const span = months.length ? (Number(months.at(-1)!.month.slice(0, 4)) - Number(months[0].month.slice(0, 4))) * 12 + Number(months.at(-1)!.month.slice(5)) - Number(months[0].month.slice(5)) + 1 : 0;
  return { method: "recorded-month-average" as const, asOf: today, months, count: months.reduce((sum, month) => sum + month.count, 0), currentMonthCount, missingMonths: span - months.length, income, expense, averageIncome, averageExpense, averageNet: averageIncome - averageExpense, categories: [...categories].map(([name, total]) => ({ name, total, monthlyAverage: Math.round(total / months.length) })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "ja")) };
}
export type CashFlowHistory = ReturnType<typeof buildCashFlowHistory>;
