import { describe, expect, it } from "vitest";
import { normalizeStoreName, parseReceipt } from "@/lib/receipt-parser";

describe("parseReceipt", () => {
  it("合計金額、日付、店名を推測する", () => {
    const receipt = parseReceipt([
      "セブンイレブン 小平店",
      "2026/06/13",
      "小計 800",
      "合計 ¥1,200",
      "おつり 800",
    ]);

    expect(receipt.amount).toBe(1200);
    expect(receipt.date?.getFullYear()).toBe(2026);
    expect(receipt.date?.getMonth()).toBe(5);
    expect(receipt.date?.getDate()).toBe(13);
    expect(receipt.store).toBe("セブンイレブン");
  });

  it("全角金額を読める", () => {
    expect(parseReceipt(["合計　１，５００円"]).amount).toBe(1500);
  });

  it("店舗名の表記揺れを整える", () => {
    expect(normalizeStoreName("7 ファミリー マート")).toBe("ファミリーマート");
  });
});
