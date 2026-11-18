import { describe, expect, it } from "vitest";
import { buildCashFlowHistory } from "./cash-flow-history";
import { defaultCashPlan, simulateCashPlan } from "./cash-flow-plan";
import { forecastTicks, learnCashFlowPrediction, simulateLearnedCashPlan } from "./cash-flow-prediction";
const makeHistory = (values: { income: number; expense: number }[]) => buildCashFlowHistory(values.flatMap((value, i) => [{ date: `2026-${String(i + 1).padStart(2, "0")}-01`, amount: -value.income }, { date: `2026-${String(i + 1).padStart(2, "0")}-02`, amount: value.expense }]), "2026-07-01");
describe("local learned cash-flow prediction", () => {
  it("requires at least three recent recorded months", () => {
    expect(learnCashFlowPrediction(makeHistory([{ income: 1, expense: 0 }])).available).toBe(false);
    const history = makeHistory(Array.from({ length: 3 }, () => ({ income: 100, expense: 50 })));
    expect(learnCashFlowPrediction({ ...history, asOf: "2027-07-01" }).available).toBe(false);
  });
  it("learns constant income and expenses without inventing growth", () => {
    const prediction = learnCashFlowPrediction(makeHistory(Array.from({ length: 6 }, () => ({ income: 300000, expense: 200000 }))));
    expect(prediction.available).toBe(true);
    if (!prediction.available) throw Error("unavailable");
    expect(prediction.averageNet).toBe(100000);
    expect(prediction.forecast).toHaveLength(12);
    expect(prediction.forecast[0]).toEqual({ month: "2026-07", income: 300000, expense: 200000, net: 100000 });
    expect(prediction.forecast[11].month).toBe("2027-06");
  });
  it("learns a changing trend, bounds predictions by observed amounts and remains deterministic", () => {
    const history = makeHistory(Array.from({ length: 6 }, (_, i) => ({ income: 300000, expense: 300000 - i * 20000 })));
    const prediction = learnCashFlowPrediction(history);
    expect(prediction).toEqual(learnCashFlowPrediction(history));
    if (!prediction.available) throw Error("unavailable");
    expect(prediction.expense.slope).toBeLessThan(0);
    expect(prediction.forecast[11].expense).toBeLessThan(prediction.forecast[0].expense);
    for (const month of prediction.forecast) {
      expect(month.expense).toBeGreaterThanOrEqual(0);
      expect(month.expense).toBeLessThanOrEqual(300000);
      expect(Number.isInteger(month.net)).toBe(true);
    }
  });
  it("uses the latest 24 recorded months and actual calendar distance", () => {
    const months = Array.from({ length: 30 }, (_, i) => { const date = new Date(Date.UTC(2023, i, 1)).toISOString().slice(0, 10); return { date, amount: -100000 }; });
    const history = buildCashFlowHistory(months, "2025-07-01");
    const prediction = learnCashFlowPrediction(history);
    if (!prediction.available) throw Error("unavailable");
    expect(prediction.months).toHaveLength(24);
    expect(prediction.months[0].month).toBe("2023-07");
    expect(prediction.months.at(-1)!.month).toBe("2025-06");
  });
  it("projects learned net while preserving balances, events and investment rules", () => {
    const prediction = learnCashFlowPrediction(makeHistory(Array.from({ length: 6 }, () => ({ income: 300000, expense: 200000 }))));
    const plan = { ...defaultCashPlan(), startAge: 30, endAge: 31, initialCash: 1000000, monthlyNet: -5000, rules: [
      { kind: "investment" as const, id: "nisa", name: "NISA", from: 30, to: null, monthly: 10000, rate: 0, initial: 100000 },
      { kind: "event" as const, id: "car", name: "車", ageAtStart: null, age: 31, amount: 500000 },
    ] };
    const learned = simulateLearnedCashPlan(plan, prediction);
    expect(learned[0]).toMatchObject({ cash: 1000000, investment: 100000, total: 1100000 });
    expect(learned[1]).toMatchObject({ cash: 2080000, investment: 220000, total: 2300000 });
    expect(learned[2]).toMatchObject({ cash: 2660000, investment: 340000, total: 3000000 });
    expect(simulateCashPlan(plan, 100000)[1].cash).toBe(820000);
  });
  it("uses varying predicted months for year one and a fixed predicted mean afterwards", () => {
    const prediction = learnCashFlowPrediction(makeHistory(Array.from({ length: 6 }, (_, i) => ({ income: 300000, expense: 300000 - i * 20000 }))));
    if (!prediction.available) throw Error("unavailable");
    const result = simulateLearnedCashPlan({ ...defaultCashPlan(), startAge: 30, endAge: 32 }, prediction);
    const firstYear = prediction.forecast.reduce((sum, month) => sum + month.net, 0);
    expect(result[1].cash).toBe(firstYear);
    expect(result[2].cash - result[1].cash).toBe(prediction.averageNet * 12);
    expect(result[3].cash - result[2].cash).toBe(prediction.averageNet * 12);
  });
});
describe("chart interval ticks", () => {
  it.each([1, 5, 10] as const)("keeps both ends and the requested %s-year spacing", step => {
    const ticks = forecastTicks(72, step);
    expect(ticks[0]).toBe(0); expect(ticks.at(-1)).toBe(71);
    expect(ticks).toContain(1);
    if (step === 5) expect(ticks.slice(1, 4)).toEqual([1, 6, 11]);
    if (step === 10) expect(ticks.slice(1, 4)).toEqual([1, 11, 21]);
  });
  it("handles missing/one-year data and whole-range ticks", () => {
    expect(forecastTicks(0, 10)).toEqual([]);
    expect(forecastTicks(2, 10)).toEqual([0, 1]);
    expect(forecastTicks(72, "all").at(-1)).toBe(71);
  });
});
