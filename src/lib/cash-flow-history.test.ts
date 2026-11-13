import { describe, expect, it } from "vitest";
import { buildCashFlowHistory } from "./cash-flow-history";
describe("historical family forecast baseline", () => {
  it("uses all recorded completed months and excludes gaps, current month and future records", () => {
    const result = buildCashFlowHistory([
      { date: "2025-01-01", amount: -300000 },
      { date: "2025-01-02", amount: 100000, category: { name: "生活費" } },
      { date: "2026-10-01", amount: -500000 },
      { date: "2026-10-02", amount: 200000, category: { name: "生活費" } },
      { date: "2026-11-01", amount: 999999 },
      { date: "2026-12-01", amount: -999999 },
    ], "2026-11-13");
    expect(result).toMatchObject({ count: 4, currentMonthCount: 1, missingMonths: 20, income: 800000, expense: 300000, averageIncome: 400000, averageExpense: 150000, averageNet: 250000 });
    expect(result.months.map(month => month.month)).toEqual(["2025-01", "2026-10"]);
    expect(result.categories).toEqual([{ name: "生活費", total: 300000, monthlyAverage: 150000 }]);
  });
  it("rounds means to yen and preserves a negative net", () => {
    const result = buildCashFlowHistory([{ date: new Date("2026-09-01"), amount: 3 }, { date: "2026-10-01", amount: -1 }], "2026-11-13");
    expect(result).toMatchObject({ averageIncome: 1, averageExpense: 2, averageNet: -1 });
  });
  it("does not invent income or expenses when there is no eligible history", () => {
    expect(buildCashFlowHistory([{ date: "2026-11-01", amount: 100 }], "2026-11-13")).toMatchObject({ months: [], count: 0, averageNet: 0, categories: [] });
  });
});
