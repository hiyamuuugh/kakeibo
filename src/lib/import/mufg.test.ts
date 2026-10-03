import { describe, it, expect } from "vitest";
import { parseDate, parseAmount, parseMufgCsv } from "./mufg";

describe("parseDate", () => {
  it("スラッシュ区切りの日付をパースする", () => {
    const d = parseDate("2026/06/01");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(5); // 0-indexed
    expect(d!.getDate()).toBe(1);
  });

  it("不正な文字列はnullを返す", () => {
    expect(parseDate("invalid")).toBeNull();
    expect(parseDate("")).toBeNull();
  });
});

describe("parseAmount", () => {
  it("カンマ付き金額をパースする", () => {
    expect(parseAmount("1,000")).toBe(1000);
    expect(parseAmount("100,000")).toBe(100000);
  });

  it("円記号付き金額をパースする", () => {
    expect(parseAmount("¥500")).toBe(500);
  });

  it("空文字は0を返す", () => {
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("-")).toBe(0);
  });
});

describe("parseMufgCsv", () => {
  const baseCsv = [
    "日付,摘要,摘要内容,お支払い金額（円）,お預かり金額（円）,残高（円）",
    "2026/06/01,振込,給与振込,,200000,500000",
    "2026/06/02,引出し,ATM引出し,30000,,470000",
    "2026/06/03,引落し,PAYPAYカード,15000,,455000",
    "2026/06/04,引落し,ラクテンカードサービス,20000,,435000",
    "2026/06/05,引落し,ﾗｸﾃﾝｶｰﾄﾞ引落,8000,,427000",
  ].join("\n");

  it("収入行を負の金額で取り込む", () => {
    const rows = parseMufgCsv(baseCsv);
    const income = rows.find((r) => r.description === "給与振込");
    expect(income).toBeDefined();
    expect(income!.amount).toBe(-200000);
  });

  it("支出行を正の金額で取り込む", () => {
    const rows = parseMufgCsv(baseCsv);
    const atm = rows.find((r) => r.description === "ATM引出し");
    expect(atm).toBeDefined();
    expect(atm!.amount).toBe(30000);
  });

  it("CSV行を読み込み、除外判定は取込APIに委ねる", () => {
    const rows = parseMufgCsv(baseCsv);
    expect(rows).toHaveLength(5);
    expect(rows.some((r) => r.description === "PAYPAYカード")).toBe(true);
    expect(rows.some((r) => r.description === "ラクテンカードサービス")).toBe(true);
  });

  it("ヘッダー前に説明行がある場合でも正しくパースする", () => {
    const csvWithPreamble = [
      "三菱UFJダイレクト 入出金明細",
      "期間: 2026年6月",
      "日付,摘要,摘要内容,お支払い金額（円）,お預かり金額（円）,残高（円）",
      "2026/06/01,振込,給与振込,,100000,100000",
    ].join("\n");
    const rows = parseMufgCsv(csvWithPreamble);
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(-100000);
  });
});
