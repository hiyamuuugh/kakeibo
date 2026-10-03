import { describe, expect, it } from "vitest";
import { findMatchingRuleCategoryId } from "@/lib/merchant-rule-match";

describe("findMatchingRuleCategoryId", () => {
  it("登録済みルールを部分一致で返す", () => {
    expect(
      findMatchingRuleCategoryId("モバイルSuica チャージ", [
        { merchant: "Suica", categoryId: "transport" },
      ])
    ).toBe("transport");
  });

  it("半角全角や空白の差を吸収する", () => {
    expect(
      findMatchingRuleCategoryId("ｼﾞﾄﾞｳ ﾃｱﾃ ｺﾀﾞｲﾗｼ", [
        { merchant: "ジドウテアテコダイラシ", categoryId: "subsidy" },
      ])
    ).toBe("subsidy");
  });

  it("一致しなければnullを返す", () => {
    expect(findMatchingRuleCategoryId("スーパー", [{ merchant: "Suica", categoryId: "transport" }])).toBeNull();
  });

  it("収入に支出カテゴリのルールを適用しない", () => {
    expect(
      findMatchingRuleCategoryId("スーパー入金", [
        { merchant: "スーパー", categoryId: "daily", category: { type: "expense" } },
      ], -1000)
    ).toBeNull();
  });
});
