export type LedgerEntry = { date: Date | string; amount: number; source: string };
type Totals = { income: number; expense: number; net: number; count: number };
const blank = (): Totals => ({ income: 0, expense: 0, net: 0, count: 0 });
const dayKey = (date: Date | string) => (date instanceof Date ? date.toISOString() : date).slice(0, 10);
const add = (total: Totals, amount: number) => {
  total.income += Math.max(0, -amount);
  total.expense += Math.max(0, amount);
  total.net -= amount;
  total.count += 1;
};
export const japanToday = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
export const validMonth = (month: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && Number(month.slice(0, 4)) >= 1900 && Number(month.slice(0, 4)) <= 9998;
export function monthAt(month: string, offset: number) {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1 + offset, 1)).toISOString().slice(0, 7);
}
export function referenceDate(month: string, today: string) {
  return month === today.slice(0, 7) ? today : new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
}
function afterMonths(date: string, offset: number) {
  const year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7));
  const last = new Date(Date.UTC(year, month - 1 + offset + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1 + offset, Math.min(Number(date.slice(8, 10)), last))).toISOString().slice(0, 10);
}
const sourceLabels: Record<string, string> = { manual: "直接入力", paypay: "PayPay", paypay_card: "PayPayカード", rakuten: "楽天カード", mufg: "三菱UFJ銀行", smbc: "三井住友銀行", saison: "セゾンカード" };
export const sourceLabel = (source: string) => Object.hasOwn(sourceLabels, source) ? sourceLabels[source] : source;

/** The cumulative figure starts at zero at the first recorded transaction, not a bank balance. */
export function buildCashFlow(entries: LedgerEntry[], month: string, today: string) {
  const asOf = referenceDate(month, today);
  const rows = entries.map(row => ({ ...row, day: dayKey(row.date) })).filter(row => row.day <= asOf).sort((a, b) => a.day.localeCompare(b.day));
  const monthTotals = new Map<string, Totals>();
  const dailyTotals = new Map<string, Totals>();
  const sources = new Map<string, { total: Totals; current: Totals; months: Map<string, number> }>();
  const all = blank(), current = blank();
  let opening = 0;
  for (const row of rows) {
    const key = row.day.slice(0, 7), source = row.source || "manual";
    const monthly = monthTotals.get(key) ?? blank(); add(monthly, row.amount); monthTotals.set(key, monthly);
    add(all, row.amount);
    const bucket = sources.get(source) ?? { total: blank(), current: blank(), months: new Map<string, number>() };
    add(bucket.total, row.amount);
    bucket.months.set(key, (bucket.months.get(key) ?? 0) - row.amount);
    if (key === month) {
      add(current, row.amount); add(bucket.current, row.amount);
      const daily = dailyTotals.get(row.day) ?? blank(); add(daily, row.amount); dailyTotals.set(row.day, daily);
    } else if (key < month) opening -= row.amount;
    sources.set(source, bucket);
  }
  let cumulative = opening;
  const daily = Array.from({ length: Number(asOf.slice(8, 10)) }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, "0")}`;
    const total = dailyTotals.get(date) ?? blank(); cumulative += total.net;
    return { date, label: `${index + 1}日`, income: total.income, expense: total.expense, cumulative };
  });
  const months = Array.from({ length: 12 }, (_, index) => monthAt(month, index - 11));
  let monthlyCumulative = rows.filter(row => row.day.slice(0, 7) < months[0]).reduce((sum, row) => sum - row.amount, 0);
  const monthly = months.map(key => { const total = monthTotals.get(key) ?? blank(); monthlyCumulative += total.net; return { month: key, ...total, cumulative: monthlyCumulative }; });
  const sourceSeries = [...sources.entries()].map(([source, bucket]) => {
    let value = rows.filter(row => (row.source || "manual") === source && row.day.slice(0, 7) < months[0]).reduce((sum, row) => sum - row.amount, 0);
    const history = months.map(key => { value += bucket.months.get(key) ?? 0; return { month: key, cumulative: value }; });
    return { source, label: sourceLabel(source), cumulative: bucket.total.net, ...bucket.current, totalCount: bucket.total.count, history };
  }).sort((a, b) => Math.abs(b.cumulative) - Math.abs(a.cumulative) || a.label.localeCompare(b.label, "ja"));
  const baseline = [-3, -2, -1].map(offset => monthAt(month, offset)).filter(key => (monthTotals.get(key)?.count ?? 0) > 0);
  const averageIncome = baseline.length ? Math.round(baseline.reduce((sum, key) => sum + monthTotals.get(key)!.income, 0) / baseline.length) : 0;
  const averageExpense = baseline.length ? Math.round(baseline.reduce((sum, key) => sum + monthTotals.get(key)!.expense, 0) / baseline.length) : 0;
  const averageNet = averageIncome - averageExpense;
  const forecast = baseline.length ? Array.from({ length: 7 }, (_, index) => ({ date: afterMonths(asOf, index), cumulative: all.net + averageNet * index })) : [];
  return { month, asOf, firstDate: rows[0]?.day ?? null, count: rows.length, current, cumulative: all.net, daily, monthly, sources: sourceSeries, outlook: { baseline, averageIncome, averageExpense, averageNet, points: forecast } };
}
export type CashFlowData = ReturnType<typeof buildCashFlow>;
