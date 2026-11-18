import { expect, it } from "vitest";
import { buildMonthlyRange, buildMonthlyStats, type StatsTransaction } from "./monthly-stats";
const food = { id: "food", name: "食費", color: "#336644", icon: "circle" };
const salary = { id: "salary", name: "給料", color: "#336699", icon: "circle" };
const row = (date: string, amount: number, category: typeof food | null): StatsTransaction => ({ date: new Date(date), amount, category, categoryId: category?.id ?? null });
it("keeps range totals/categories identical to individual monthly statistics", () => {
  const entries = [row("2026-10-01Z", 100, food), row("2026-10-02Z", 250, food), row("2026-10-03Z", 50, null), row("2026-10-03Z", -1000, salary), row("2026-11-01Z", 1000, food)];
  const actual = buildMonthlyRange("2026-09", "2026-11", entries);
  expect(actual).toHaveLength(3);
  expect(actual[0]).toMatchObject({ total: 0, income: 0, count: 0 });
  for (const month of actual) expect(month).toEqual({ ...buildMonthlyStats(month.month, entries.filter(row => row.date.toISOString().startsWith(month.month))), daily: [] });
  expect(actual[1]).toMatchObject({ total: 400, income: 1000, count: 3 });
  expect(actual[1].categories.map(row => [row.name, row.total])).toEqual([["食費", 350], ["未分類", 50]]);
});
it("fills a year boundary and bounds records to the requested months", () => {
  const result = buildMonthlyRange("2025-12", "2026-02", [row("2025-11-01Z", 999, food), row("2026-01-01Z", 100, food), row("2026-03-01Z", 999, food)]);
  expect(result.map(row => [row.month, row.total])).toEqual([["2025-12", 0], ["2026-01", 100], ["2026-02", 0]]);
});
