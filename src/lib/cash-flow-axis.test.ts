import { describe, expect, it } from "vitest";
import { cashFlowAxis, visibleCashFlowRange } from "./cash-flow-axis";
describe("visible cash-flow axis", () => {
  it("fits early-year amounts instead of far-future hundreds of millions", () => {
    const early = cashFlowAxis([1000000, 1200000, 1500000]);
    expect(early.domain[0]).toBeLessThan(1000000);
    expect(early.domain[1]).toBeLessThan(2000000);
    expect(early.domain[1]).toBeGreaterThan(1500000);
    expect(cashFlowAxis([1000000, 800000000]).domain[1]).toBeGreaterThanOrEqual(800000000);
  });
  it("keeps negative cash and constant or empty balances readable", () => {
    expect(cashFlowAxis([-100000, 100000]).domain[0]).toBeLessThan(-100000);
    for (const values of [[], [0, 0], [810000000, 810000000]]) {
      const axis = cashFlowAxis(values);
      expect(axis.domain[1]).toBeGreaterThan(axis.domain[0]);
      expect(axis.ticks.length).toBeGreaterThan(1);
      expect(axis.ticks.every(Number.isFinite)).toBe(true);
    }
  });
  it("tracks the visible time window and includes boundary neighbours", () => {
    const early = visibleCashFlowRange(0, 240, 5232, 72);
    const late = visibleCashFlowRange(4992, 240, 5232, 72);
    expect(early.start).toBe(0); expect(early.end).toBeLessThan(6);
    expect(late.start).toBeGreaterThan(65); expect(late.end).toBe(71);
    expect(visibleCashFlowRange(0, 100, 100, 0)).toEqual({ start: 0, end: 0 });
  });
});
