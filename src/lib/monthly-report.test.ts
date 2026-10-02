import { describe, expect, it } from "vitest";
import { buildMonthlyReport } from "@/lib/monthly-report";

describe("buildMonthlyReport", () => {
  it("赤字を優先して知らせる", () => {
    const report = buildMonthlyReport(
      { total: 120000, income: 100000, categories: [] },
      [90000]
    );

    expect(report.tone).toBe("alert");
    expect(report.headline).toContain("赤字");
  });

  it("支出が前月以下で黒字なら良好にする", () => {
    const report = buildMonthlyReport(
      { total: 80000, income: 120000, categories: [] },
      [90000]
    );

    expect(report.tone).toBe("good");
  });

  it("突出したカテゴリを知らせる", () => {
    const report = buildMonthlyReport(
      {
        total: 100000,
        income: 150000,
        categories: [
          {
            name: "食費",
            total: 50000,
          },
        ],
      },
      [100000]
    );

    expect(report.tone).toBe("warn");
    expect(report.headline).toContain("食費");
  });
});
