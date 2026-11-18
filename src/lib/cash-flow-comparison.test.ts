import { describe, expect, it } from "vitest";
import { defaultCashPlan, simulateCashPlan } from "./cash-flow-plan";
import { balanceChange, comparisonInvestments, comparisonRows } from "./cash-flow-comparison";
const plan = () => ({ ...defaultCashPlan(), startAge: 30, startYear: 2026, endAge: 31, initialCash: 2000000, initialOtherAssets: 50000, monthlyNet: 0, rules: [{ id: "nisa", name: "積立NISA", kind: "investment" as const, from: 30, to: null, monthly: 10000, rate: 0, initial: 100000 }] });
describe("year-to-year forecast comparison", () => {
  it("labels annual snapshots by year and excludes the opening snapshot from year-end selection", () => {
    expect(simulateCashPlan(plan(), 0).map(point => point.year)).toEqual([null, 2026, 2027]);
  });
  it("compares cash, invested balance, other assets and totals without counting deposits as returns", () => {
    const points = simulateCashPlan(plan(), 0), left = points[1], right = points[2];
    expect(comparisonRows(left, right).find(row => row.id === "cash")).toMatchObject({ left: 1880000, right: 1760000, difference: -120000 });
    expect(comparisonRows(left, right).find(row => row.id === "investment")).toMatchObject({ left: 220000, right: 340000 });
    expect(comparisonRows(left, right).find(row => row.id === "total")?.difference).toBe(0);
    expect(comparisonInvestments(left, right)[0]).toMatchObject({ left: 220000, right: 340000, leftPrincipal: 220000, rightPrincipal: 340000, leftProfit: 0, rightProfit: 0, difference: 120000 });
  });
  it("tracks compounded investment profit separately from starting balance", () => {
    const settings = plan(); settings.rules[0].monthly = 0; settings.rules[0].rate = 10;
    const points = simulateCashPlan(settings, 0);
    expect(points[1].investmentBreakdown[0]).toMatchObject({ balance: 110000, principal: 100000, profit: 10000 });
    expect(comparisonInvestments(points[1], points[2])[0]).toMatchObject({ right: 121000, rightProfit: 21000, difference: 11000 });
  });
  it("avoids undefined rates for zero or negative starting balances", () => {
    expect(balanceChange(0, 100)).toEqual({ difference: 100, percent: null });
    expect(balanceChange(-100, 50)).toEqual({ difference: 150, percent: null });
    expect(balanceChange(100, 150)).toEqual({ difference: 50, percent: 50 });
    expect(balanceChange(100, 50)).toEqual({ difference: -50, percent: -50 });
    expect(balanceChange(100, 100)).toEqual({ difference: 0, percent: 0 });
  });
  it("keeps multiple investment rules separate and supports reversed years", () => {
    const settings = plan(); settings.rules.push({ ...settings.rules[0], id: "fund", name: "投資信託", initial: 500000 });
    const points = simulateCashPlan(settings, 0);
    const rows = comparisonInvestments(points[2], points[1]);
    expect(rows.map(row => row.name)).toEqual(["積立NISA", "投資信託"]);
    expect(rows[0].difference).toBe(-120000);
  });
});
