import { describe, expect, it } from "vitest";
import { parseSaisonCsv } from "@/lib/import/saison";

describe("parseSaisonCsv", () => {
  it("説明行の後にあるセゾンCSVを読み込む", () => {
    const rows = parseSaisonCsv([
      "セゾンカード ご利用明細",
      "対象月,2026年10月",
      "利用日,ご利用店名及び商品名,利用金額",
      '2026/10/01,スーパー,"1,234"',
    ].join("\n"));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.description).toBe("スーパー");
    expect(rows[0]?.amount).toBe(1234);
  });
});
