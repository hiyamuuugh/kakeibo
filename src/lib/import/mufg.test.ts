import { describe, it, expect } from "vitest";
import { isCreditCardPayment, parseDate, parseAmount, parseMufgCsv } from "./mufg";

describe("isCreditCardPayment", () => {
  it("PAYPAYカードをスキップする", () => {
    expect(isCreditCardPayment("PAYPAYカード")).toBe(true);
  });

  it("大文字小文字を区別しない（paypayカード）", () => {
    expect(isCreditCardPayment("paypayカード")).toBe(true);
  });

  it("半角カナのPayPayカードをスキップする", () => {
    expect(isCreditCardPayment("ﾍﾟｲﾍﾟｲｶｰﾄﾞ請求")).toBe(true);
  });

  it("ラクテンカードサービをスキップする", () => {
    expect(isCreditCardPayment("ラクテンカードサービス")).toBe(true);
  });

  it("半角カナの楽天カードをスキップする", () => {
    expect(isCreditCardPayment("ﾗｸﾃﾝｶｰﾄﾞ引落")).toBe(true);
  });

  it("通常の取引はスキップしない", () => {
    expect(isCreditCardPayment("セブンイレブン")).toBe(false);
    expect(isCreditCardPayment("ATM引出し")).toBe(false);
    expect(isCreditCardPayment("給与振込")).toBe(false);
  });
});

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

  it("PAYPAYカードの引落をスキップする", () => {
    const rows = parseMufgCsv(baseCsv);
    expect(rows.find((r) => r.description === "PAYPAYカード")).toBeUndefined();
  });

  it("ラクテンカードサービスの引落をスキップする", () => {
    const rows = parseMufgCsv(baseCsv);
    expect(rows.find((r) => r.description.includes("ラクテン"))).toBeUndefined();
  });

  it("半角カナの楽天カードをスキップする", () => {
    const rows = parseMufgCsv(baseCsv);
    expect(rows.find((r) => r.description.includes("ﾗｸﾃﾝ"))).toBeUndefined();
  });

  it("クレカ除外後は2件のみ取り込む", () => {
    const rows = parseMufgCsv(baseCsv);
    expect(rows).toHaveLength(2);
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
