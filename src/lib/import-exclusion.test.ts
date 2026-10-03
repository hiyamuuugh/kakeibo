import { describe, expect, it } from "vitest";
import { isImportExcluded } from "@/lib/import-exclusion";

describe("isImportExcluded", () => {
  it("登録名を含む明細を除外する", () => {
    expect(isImportExcluded("楽天証券 投資信託", [{ name: "楽天証券" }])).toBe(true);
  });

  it("登録名を含まない明細は除外しない", () => {
    expect(isImportExcluded("楽天市場", [{ name: "楽天証券" }])).toBe(false);
  });
});
