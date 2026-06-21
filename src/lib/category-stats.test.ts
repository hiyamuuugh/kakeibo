import { describe, expect, it } from "vitest";
import { buildCategoryStats } from "./category-stats";

describe("buildCategoryStats", () => {
  it("未分類の収入を絶対値で集計する", () => {
    const stats = buildCategoryStats(
      [
        { amount: -1000, categoryId: null, category: null },
        { amount: -2500, categoryId: null, category: null },
      ],
      {
        fallbackId: "__income_uncategorized__",
        fallbackName: "未分類",
        fallbackColor: "#9ca3af",
        fallbackIcon: "circle-help",
        useAbsoluteAmount: true,
      },
    );

    expect(stats).toEqual([
      {
        id: "__income_uncategorized__",
        name: "未分類",
        color: "#9ca3af",
        icon: "circle-help",
        total: 3500,
        count: 2,
      },
    ]);
  });

  it("収入に紐づいた許可外カテゴリを未分類へ集約する", () => {
    const stats = buildCategoryStats(
      [
        {
          amount: -1000,
          categoryId: "daily-goods",
          category: {
            id: "daily-goods",
            name: "日用品",
            color: "#000000",
            icon: "shopping-bag",
          },
        },
        { amount: -2500, categoryId: null, category: null },
      ],
      {
        fallbackId: "__income_uncategorized__",
        fallbackName: "未分類",
        fallbackColor: "#9ca3af",
        fallbackIcon: "circle-help",
        useAbsoluteAmount: true,
        allowedCategoryNames: ["給料", "補助金", "その他", "未分類"],
      },
    );

    expect(stats).toEqual([
      {
        id: "__income_uncategorized__",
        name: "未分類",
        color: "#9ca3af",
        icon: "circle-help",
        total: 3500,
        count: 2,
      },
    ]);
  });
});
