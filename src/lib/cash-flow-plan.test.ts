import { describe, expect, it } from "vitest";
import { defaultCashPlan, parseCashPlan, simulateCashPlan, type CashPlan } from "./cash-flow-plan";
const plan = (changes: Partial<CashPlan> = {}): CashPlan => ({ ...defaultCashPlan(), startAge: 30, endAge: 31, monthlyNet: 0, ...changes });
describe("age-based cash flow rules", () => {
  it("does not assume a starting age or bank balance", () => {
    expect(defaultCashPlan().startAge).toBeNull();
    expect(simulateCashPlan(defaultCashPlan(), 10000)).toEqual([]);
  });
  it("reads existing saved plans without other assets", () => {
    const { initialOtherAssets: _old, ...legacy } = plan();
    expect(parseCashPlan(legacy).initialOtherAssets).toBe(0);
  });
  it("recalculates from manual balances without double counting investments", () => {
    const settings = plan({ initialCash: 10000, initialOtherAssets: 500, rules: [{ id: "nisa", name: "NISA", kind: "investment", from: 30, to: null, monthly: 100, rate: 10, initial: 1000 }] });
    const points = simulateCashPlan(settings, 0);
    expect(points[0]).toMatchObject({ cash: 10000, investment: 1500, total: 11500 });
    const updated = simulateCashPlan({ ...settings, initialCash: 20000, initialOtherAssets: 700, rules: settings.rules.map(rule => ({ ...rule, initial: 2000 })) }, 0);
    expect(updated[0]).toMatchObject({ cash: 20000, investment: 2700, total: 22700 });
    expect(updated[1].total - points[1].total).toBe(11300);
  });
  it("retains other assets without an investment rule or assumed growth", () => {
    expect(simulateCashPlan(plan({ initialOtherAssets: 500 }), 0).map(point => point.investment)).toEqual([500, 500, 500]);
    for (const value of [-1, null, Infinity, 1.5]) expect(() => parseCashPlan({ ...plan(), initialOtherAssets: value })).toThrow();
  });
  it("switches a child's education expense from age 5 to age 6", () => {
    const result = simulateCashPlan(plan({ initialCash: 1000, rules: [{ id: "edu", name: "教育費", kind: "annual", ageAtStart: 5, flow: "expense", ranges: [{ from: 0, to: 5, amount: 100 }, { from: 6, to: null, amount: 200 }] }] }), 0);
    expect(result.map(point => point.cash)).toEqual([1000, 900, 700]);
  });
  it("charges a trip exactly once at the specified own age", () => {
    const result = simulateCashPlan(plan({ initialCash: 2000000, endAge: 32, rules: [{ id: "trip", name: "旅行", kind: "event", ageAtStart: null, age: 31, amount: 1000000 }] }), 0);
    expect(result.map(point => point.total)).toEqual([2000000, 2000000, 1000000, 1000000]);
  });
  it("moves contributions from cash to investments without inventing an expense or asset", () => {
    const result = simulateCashPlan(plan({ initialCash: 1200, rules: [{ id: "nisa", name: "NISA", kind: "investment", from: 30, to: 30, monthly: 100, rate: 0, initial: 0 }] }), 0);
    expect(result[1]).toMatchObject({ cash: 0, investment: 1200, total: 1200, contributions: 1200 });
    expect(result[2]).toMatchObject({ cash: 0, investment: 1200, total: 1200, contributions: 0 });
  });
  it("compounds the annual assumption monthly and continues after contributions end", () => {
    const result = simulateCashPlan(plan({ rules: [{ id: "nisa", name: "NISA", kind: "investment", from: 30, to: 30, monthly: 0, rate: 10, initial: 1000 }] }), 0);
    expect(result.map(point => point.investment)).toEqual([1000, 1100, 1210]);
  });
  it("uses ledger monthly net unless manually overridden and adds annual income", () => {
    expect(simulateCashPlan(plan({ monthlyNet: null }), 500)[1].cash).toBe(6000);
    const result = simulateCashPlan(plan({ monthlyNet: 100, rules: [{ id: "income", name: "収入", kind: "annual", ageAtStart: null, flow: "income", ranges: [{ from: 30, to: 30, amount: 1000 }] }] }), 500);
    expect(result[1].cash).toBe(2200);
    expect(result[2].cash).toBe(3400);
  });
  it("preserves negative cash to expose shortfalls", () => {
    expect(simulateCashPlan(plan({ monthlyNet: -100 }), 0)[1].cash).toBe(-1200);
  });
  it("rejects overlapping education ranges", () => {
    expect(() => parseCashPlan(plan({ rules: [{ id: "edu", name: "教育費", kind: "annual", ageAtStart: 0, flow: "expense", ranges: [{ from: 0, to: 5, amount: 1 }, { from: 5, to: null, amount: 1 }] }] }))).toThrow("重複");
  });
  it.each([{ endAge: 29 }, { initialCash: -1 }, { monthlyNet: Infinity }, { startAge: 121 }])("rejects invalid basic settings %j", change => {
    expect(() => parseCashPlan(plan(change))).toThrow();
  });
  it("rejects duplicate rule ids and out-of-range return assumptions", () => {
    const rule = { id: "nisa", name: "NISA", kind: "investment" as const, from: 30, to: null, monthly: 100, rate: 0, initial: 0 };
    expect(() => parseCashPlan(plan({ rules: [rule, rule] }))).toThrow();
    expect(() => parseCashPlan(plan({ rules: [{ ...rule, rate: -100 }] }))).toThrow();
  });
});
