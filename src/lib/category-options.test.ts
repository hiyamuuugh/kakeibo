import { describe, expect, it } from "vitest";
import { getCategoriesByKind, getChartCategoryNames } from "@/lib/category-options";

const categories = [
  { id: "daily", name: "日用品", type: "expense" },
  { id: "child", name: "子ども", type: "expense" },
  { id: "income-other", name: "その他", type: "income" },
  { id: "food", name: "食費", type: "expense" },
  { id: "salary", name: "給料", type: "income" },
  { id: "expense-other", name: "その他", type: "expense" },
  { id: "expense-none", name: "未分類", type: "expense" },
  { id: "subsidy", name: "補助金", type: "income" },
  { id: "income-none", name: "未分類", type: "income" },
];

describe("getCategoriesByKind", () => {
  it("収入カテゴリを指定順で返す", () => {
    expect(getCategoriesByKind(categories, "income").map((category) => category.name)).toEqual([
      "給料",
      "補助金",
      "その他",
      "未分類",
    ]);
  });

  it("支出カテゴリから収入カテゴリを除外し、未分類を最後に扱う", () => {
    expect(getCategoriesByKind(categories, "expense").map((category) => category.name)).toEqual([
      "食費",
      "日用品",
      "子ども",
      "その他",
      "未分類",
    ]);
  });
});

describe("getChartCategoryNames", () => {
  it("収入は指定カテゴリだけを返す", () => {
    const totals = new Map([
      ["日用品", 1000],
      ["給料", 200000],
    ]);

    expect(getChartCategoryNames(totals, "income")).toEqual([
      "給料",
      "補助金",
      "その他",
      "未分類",
    ]);
  });

  it("支出は未分類を最後にする", () => {
    const totals = new Map([
      ["未分類", 1000],
      ["食費", 2000],
    ]);

    expect(getChartCategoryNames(totals, "expense").at(-1)).toBe("未分類");
  });
});
