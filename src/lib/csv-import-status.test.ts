import { describe, it, expect } from "vitest";
import { buildCsvImportStatus, csvImportScope } from "./csv-import-status";
describe("six completed CSV months", () => {
  it("crosses years and excludes the current month", () => {
    const result = buildCsvImportStatus("2026-02-01", [], [], []);
    expect(result.months).toEqual(["2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01"]);
    expect(result.sources).toHaveLength(6);
  });
  it("combines legacy records and logs, including excluded months and aliases", () => {
    const result = buildCsvImportStatus("2026-11-18", [{ source: "paypay_card", date: "2026-05-03" }], [{ source: "paypay-card", month: "2026-06" }], ["paypay_card"]);
    expect(result.sources.map(s => s.id)).toEqual(["paypay-card"]);
    expect(result.missingMonths).toEqual(["2026-07", "2026-08", "2026-09", "2026-10"]);
  });
  it("tracks each active source separately", () => {
    const logs = ["05", "06", "07", "08", "09", "10"].map(month => ({ source: "paypay", month: `2026-${month}` }));
    expect(buildCsvImportStatus("2026-11-18", [], logs, []).missingMonths).toEqual([]);
    expect(buildCsvImportStatus("2026-11-18", [], logs, ["rakuten"]).missingMonths).toHaveLength(6);
    expect(csvImportScope("a")).not.toBe(csvImportScope("b"));
    expect(csvImportScope(null)).toBe("unassigned");
  });
});
