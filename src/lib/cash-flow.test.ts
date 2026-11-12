import { describe, expect, it } from "vitest";
import { buildCashFlow, monthAt, sourceLabel, type LedgerEntry } from "./cash-flow";
const rows: LedgerEntry[] = [
  { date: "2026-08-01", amount: -1000, source: "manual" }, { date: "2026-08-02", amount: 300, source: "smbc" },
  { date: "2026-09-01", amount: -2000, source: "manual" }, { date: "2026-09-02", amount: 600, source: "smbc" },
  { date: "2026-10-01", amount: -3000, source: "manual" }, { date: "2026-10-02", amount: 900, source: "smbc" },
  { date: new Date("2026-11-03T00:00:00Z"), amount: -4000, source: "manual" }, { date: "2026-11-12", amount: 1000, source: "smbc" },
  { date: "2026-11-14", amount: -10000, source: "manual" },
];
describe("read-only cash flow calculations", () => {
  it("uses ledger signs and carries earlier recorded net into the selected month", () => {
    const data = buildCashFlow(rows, "2026-11", "2026-11-12");
    expect(data.current).toEqual({ income: 4000, expense: 1000, net: 3000, count: 2 });
    expect(data.cumulative).toBe(7200);
    expect(data.daily[0].cumulative).toBe(4200);
    expect(data.daily.at(-1)?.cumulative).toBe(7200);
    expect(data.count).toBe(8);
    expect(data.daily).toHaveLength(12);
  });
  it("returns 12 monthly buckets and reconciling source totals without inventing account balances", () => {
    const data = buildCashFlow(rows, "2026-11", "2026-11-12");
    expect(data.monthly).toHaveLength(12);
    expect(data.monthly.at(-1)).toMatchObject({ month: "2026-11", net: 3000, cumulative: 7200 });
    expect(data.sources.reduce((sum, source) => sum + source.cumulative, 0)).toBe(7200);
    expect(data.sources.reduce((sum, source) => sum + source.net, 0)).toBe(3000);
    expect(data.sources.find(source => source.source === "smbc")?.label).toBe("三井住友銀行");
  });
  it("uses only recorded, completed baseline months and excludes future transactions", () => {
    const data = buildCashFlow(rows, "2026-11", "2026-11-12");
    expect(data.outlook).toMatchObject({ baseline: ["2026-08", "2026-09", "2026-10"], averageIncome: 2000, averageExpense: 600, averageNet: 1400 });
    expect(data.outlook.points[1]).toEqual({ date: "2026-12-12", cumulative: 8600 });
    expect(data.outlook.points[6].cumulative).toBe(15600);
  });
  it("does not fabricate a projection when no previous-month records exist", () => {
    const data = buildCashFlow([{ date: "2026-11-01", amount: 100, source: "manual" }], "2026-11", "2026-11-12");
    expect(data.outlook.points).toEqual([]);
    expect(data.cumulative).toBe(-100);
  });
  it("does not average missing months as if they were recorded zero-spend months", () => {
    const data = buildCashFlow(rows.slice(0, 2), "2026-11", "2026-11-12");
    expect(data.outlook.baseline).toEqual(["2026-08"]);
    expect(data.outlook.averageNet).toBe(700);
  });
  it("clamps forecast dates to valid month ends without drifting in later months", () => {
    const data = buildCashFlow([{ date: "2025-12-01", amount: -100, source: "manual" }], "2026-01", "2026-02-01");
    expect(data.asOf).toBe("2026-01-31");
    expect(data.outlook.points[1].date).toBe("2026-02-28");
    expect(data.outlook.points[2].date).toBe("2026-03-31");
    expect(monthAt("2026-01", -1)).toBe("2025-12");
  });
  it("handles empty data and unknown sources", () => {
    expect(buildCashFlow([], "2026-11", "2026-11-12")).toMatchObject({ count: 0, cumulative: 0, sources: [], outlook: { points: [] } });
    expect(sourceLabel("constructor")).toBe("constructor");
  });
});
