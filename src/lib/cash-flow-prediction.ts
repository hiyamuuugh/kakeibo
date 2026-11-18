import type { CashFlowHistory } from "./cash-flow-history";
import { simulateCashPlan, type CashPlan } from "./cash-flow-plan";
const monthNumber = (month: string) => Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1;
const monthLabel = (number: number) => `${Math.floor(number / 12)}-${String(number % 12 + 1).padStart(2, "0")}`;
/** Local ridge regression; no external service, generated text, or invented return assumptions. */
export function learnCashFlowPrediction(history: CashFlowHistory) {
  const months = history.months.slice(-24);
  const start = monthNumber(history.asOf.slice(0, 7));
  if (months.length < 3) return { available: false as const, reason: "学習予測には、今月より前の記録がある月が3か月以上必要です。" };
  if (start - monthNumber(months.at(-1)!.month) > 3) return { available: false as const, reason: "最新の記録が3か月を超えて前のため、予測を表示していません。最近の家計簿を取り込んでください。" };
  const x = months.map(month => monthNumber(month.month) - start);
  const weights = x.map(value => 2 ** (value / 12)); // 12-calendar-month half-life.
  const weight = weights.reduce((sum, value) => sum + value, 0);
  const meanX = x.reduce((sum, value, i) => sum + value * weights[i], 0) / weight;
  function fit(key: "income" | "expense") {
    const values = months.map(month => month[key]);
    const mean = values.reduce((sum, value, i) => sum + value * weights[i], 0) / weight;
    const variance = x.reduce((sum, value, i) => sum + weights[i] * (value - meanX) ** 2, 0);
    const covariance = values.reduce((sum, value, i) => sum + weights[i] * (x[i] - meanX) * (value - mean), 0);
    const slope = covariance / (variance + 12 * weight);
    const intercept = mean - slope * meanX;
    const ceiling = Math.max(...values);
    return { intercept, slope, ceiling, predict: (offset: number) => Math.round(Math.max(0, Math.min(ceiling, intercept + slope * offset))) };
  }
  const income = fit("income"), expense = fit("expense");
  const forecast = Array.from({ length: 12 }, (_, i) => {
    const incomeValue = income.predict(i), expenseValue = expense.predict(i);
    return { month: monthLabel(start + i), income: incomeValue, expense: expenseValue, net: incomeValue - expenseValue };
  });
  const averageIncome = Math.round(forecast.reduce((sum, month) => sum + month.income, 0) / 12);
  const averageExpense = Math.round(forecast.reduce((sum, month) => sum + month.expense, 0) / 12);
  return { available: true as const, method: "local-ridge-regression" as const, months, forecast, averageIncome, averageExpense, averageNet: averageIncome - averageExpense,
    income: { intercept: income.intercept, slope: income.slope, ceiling: income.ceiling }, expense: { intercept: expense.intercept, slope: expense.slope, ceiling: expense.ceiling } };
}
export type CashFlowPrediction = ReturnType<typeof learnCashFlowPrediction>;
export function simulateLearnedCashPlan(plan: CashPlan, prediction: CashFlowPrediction) {
  if (!prediction.available) return [];
  return simulateCashPlan(plan, prediction.averageNet, (age, month) => {
    const offset = (age - (plan.startAge ?? 0)) * 12 + month;
    return offset < 12 ? prediction.forecast[offset].net : prediction.averageNet;
  });
}
/** All annual points remain in the chart even when ticks are five/ten years apart. */
export function forecastTicks(pointCount: number, step: "all" | 1 | 5 | 10) {
  if (!pointCount) return [];
  const last = pointCount - 1, ticks = new Set([0, last]);
  if (step === "all") {
    const gap = Math.max(1, Math.ceil(last / 6));
    for (let i = gap; i < last; i += gap) ticks.add(i);
  } else for (let i = 1; i <= last; i += step) ticks.add(i);
  return [...ticks].sort((a, b) => a - b);
}
