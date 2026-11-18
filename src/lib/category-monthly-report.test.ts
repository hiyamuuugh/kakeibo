import { expect, it } from "vitest";
import { buildCategoryMonthlyReport, type ReportMonth } from "./category-monthly-report";
const month = (month: string, rows: [string, number][]): ReportMonth => ({ month, total: rows.reduce((sum, row) => sum + row[1], 0), count: rows.length, categories: rows.map(([name, total]) => ({ id: name, name, total })) });
it("compares category changes even when total spending stays the same", () => {
  const result = buildCategoryMonthlyReport(month("2026-11", [["食費", 40000], ["娯楽", 10000]]), [month("2026-10", [["食費", 20000], ["娯楽", 30000]])]);
  expect(result.biggestIncrease?.name).toBe("食費");
  expect(result.biggestIncrease?.change).toEqual({ amount: 20000, percent: 100 });
  expect(result.biggestDecrease?.name).toBe("娯楽");
  expect(result.rows[0].share).toBe(80);
});
it("excludes missing months but includes zero categories in recorded months", () => {
  const result = buildCategoryMonthlyReport(month("2026-11", [["食費", 20000]]), [month("2026-08", [["食費", 10000]]), month("2026-09", []), month("2026-10", [["交通費", 6000]])]);
  expect(result.historyMonths).toEqual(["2026-08", "2026-10"]);
  expect(result.rows.find(row => row.name === "食費")).toMatchObject({ average: 5000, change: { amount: 20000, percent: null } });
  expect(result.rows.find(row => row.name === "交通費")).toMatchObject({ amount: 0, change: { amount: -6000, percent: -100 } });
});
it("does not call missing current data a spending reduction", () => {
  const result = buildCategoryMonthlyReport(month("2026-11", []), [month("2026-10", [["食費", 20000]])]);
  expect(result.biggestDecrease).toBeNull();
});
it("does not replace an absent previous month with an older available month", () => {
  const result = buildCategoryMonthlyReport(month("2026-11", [["未分類", 9000]]), [month("2026-09", [["未分類", 1000]]), month("2026-10", [])]);
  expect(result.previousMonth).toBeNull();
  expect(result.rows[0].change).toBeNull();
  expect(result.uncategorized).toBe(9000);
});
