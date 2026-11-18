import { describe, expect, it } from "vitest";
import { defaultCashPlan, parseCashPlan, simulateCashPlan, cashRuleTemplate } from "./cash-flow-plan";
import { defaultPredictionSettings } from "./cash-flow-prediction-settings";
const base = () => ({ ...defaultCashPlan(), startYear: 2030, startAge: 30, endAge: 32, monthlyNet: 0 });
describe("calendar-year cash-flow rules", () => {
  it("applies annual calendar periods, a one-time purchase and contribution years inclusively", () => {
    const plan = parseCashPlan({ ...base(), initialCash: 1000000, rules: [
      { id: "school", name: "教育費", kind: "annual", basis: "year", ageAtStart: null, flow: "expense", ranges: [{ from: 2030, to: 2031, amount: 10000 }] },
      { id: "car", name: "車", kind: "event", basis: "year", ageAtStart: null, age: 2031, amount: 100000 },
      { id: "nisa", name: "NISA", kind: "investment", basis: "year", from: 2031, to: 2031, monthly: 1000, rate: 0, initial: 0 },
    ] });
    const points = simulateCashPlan(plan, 0);
    expect(points.map(point => point.cash)).toEqual([1000000, 990000, 868000, 868000]);
    expect(points.map(point => point.investment)).toEqual([0, 0, 12000, 12000]);
  });
  it("keeps year references fixed when the starting age changes", () => {
    const rule = { id: "car", name: "車", kind: "event", basis: "year", ageAtStart: null, age: 2031, amount: 100 };
    const plan = parseCashPlan({ ...base(), rules: [rule] });
    const shifted = { ...plan, startAge: 40, endAge: 42 };
    expect(simulateCashPlan(plan, 0).map(point => point.cash)).toEqual(simulateCashPlan(shifted, 0).map(point => point.cash));
  });
  it("preserves prediction settings and rejects invalid year coordinates", () => {
    const plan = parseCashPlan({ ...base(), predictionSettings: { ...defaultPredictionSettings(), lookbackMonths: 6 } });
    expect(plan.predictionSettings?.lookbackMonths).toBe(6);
    for (const age of [1899, 2401, 2030.5]) expect(() => parseCashPlan({ ...base(), rules: [{ id: "event", name: "event", kind: "event", basis: "year", ageAtStart: null, age, amount: 1 }] })).toThrow();
    expect(() => parseCashPlan({ ...base(), startYear: 1800 })).toThrow();
  });
  it("starts education with one range and keeps previously saved multiple ranges", () => {
    const template = cashRuleTemplate("education", 30);
    if (template.kind !== "annual") throw Error("template");
    expect(template.ranges).toHaveLength(1);
    expect(parseCashPlan({ ...base(), rules: [{ ...template, ranges: [{ from: 0, to: 5, amount: 10 }, { from: 6, to: null, amount: 20 }] }] }).rules[0]).toMatchObject({ ranges: [{ from: 0, to: 5, amount: 10 }, { from: 6, to: null, amount: 20 }] });
  });
});
