import { describe, it, expect } from "vitest";
import { parseSmbcCsv, parseDate, parseAmount } from "./smbc";

describe("parseAmount", () => {
  it("カンマ・記号を除去して数値化する", () => {
    expect(parseAmount("1,234")).toBe(1234);
    expect(parseAmount("¥5,000")).toBe(5000);
  });
  it("空文字は0", () => {
    expect(parseAmount("")).toBe(0);
  });
});

describe("parseDate", () => {
  it("スラッシュ区切りをパースする", () => {
    const d = parseDate("2026/6/12");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(5);
    expect(d?.getDate()).toBe(12);
  });
  it("不正な日付はnull", () => {
    expect(parseDate("不明")).toBeNull();
  });
});

describe("parseSmbcCsv", () => {
  const header = "年月日,お引出し,お預入れ,お取り扱い内容,残高,メモ,";

  it("出金行は正の金額になる", () => {
    const csv = `${header}\n2026/6/12,1500,,ｺﾝﾋﾞﾆ,98500,,`;
    const rows = parseSmbcCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(1500);
    expect(rows[0].description).toBe("ｺﾝﾋﾞﾆ");
  });

  it("入金行は負の金額になる", () => {
    const csv = `${header}\n2026/6/13,,200000,ｷｭｳﾖ,298500,,`;
    const rows = parseSmbcCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(-200000);
  });

  it("クレカ引落は除外する", () => {
    const csv = `${header}\n2026/6/14,30000,,ﾗｸﾃﾝｶｰﾄﾞ,68500,,`;
    expect(parseSmbcCsv(csv)).toHaveLength(0);
  });

  it("出入金ともに0の行は除外する", () => {
    const csv = `${header}\n2026/6/15,,,残高照会,68500,,`;
    expect(parseSmbcCsv(csv)).toHaveLength(0);
  });

  it("ヘッダー前の余分な行があっても検出する", () => {
    const csv = `三井住友銀行 入出金明細\n口座番号: 1234567\n${header}\n2026/6/12,1500,,ｺﾝﾋﾞﾆ,98500,,`;
    const rows = parseSmbcCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(1500);
  });

  it("摘要が空なら既定名を使う", () => {
    const csv = `${header}\n2026/6/12,1500,,,98500,,`;
    const rows = parseSmbcCsv(csv);
    expect(rows[0].description).toBe("三井住友銀行");
  });
});
