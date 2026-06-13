import Papa from "papaparse";
import { normalize } from "../normalize";

export interface MufgRow {
  date: Date;
  description: string;
  amount: number;
}

// UFJダイレクトCSVで実際に出現するクレカ引落の摘要内容
const CREDIT_KEYWORDS = [
  "PAYPAYカード",
  "ﾍﾟｲﾍﾟｲｶｰﾄﾞ",
  "ラクテンカードサービ",
  "ﾗｸﾃﾝｶｰﾄﾞ",
];

export function isCreditCardPayment(description: string): boolean {
  const lower = normalize(description);
  return CREDIT_KEYWORDS.some((kw) => lower.includes(normalize(kw)));
}

export function decodeBuffer(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8").decode(buffer).replace(/^﻿/, "");
  if (utf8.includes("日付") || utf8.includes("摘要")) return utf8;
  try {
    const sjis = new TextDecoder("shift_jis").decode(buffer);
    if (sjis.includes("日付") || sjis.includes("摘要")) return sjis;
  } catch { /* 未対応環境はスキップ */ }
  return utf8;
}

export function parseDate(dateStr: string): Date | null {
  const cleaned = dateStr.trim().replace(/\//g, "-");
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

export function parseAmount(amountStr: string): number {
  const n = parseInt(amountStr.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

export function parseMufgCsv(csvText: string): MufgRow[] {
  // 「日付」と「摘要」を含む行をヘッダーとして自動検出
  const lines = csvText.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => l.includes("日付") && l.includes("摘要"));
  const text = headerIdx >= 0 ? lines.slice(headerIdx).join("\n") : csvText;

  let rawRows: Record<string, string>[] = [];
  Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    complete(result) { rawRows = result.data; },
  });

  if (rawRows.length === 0) return [];

  const headers = Object.keys(rawRows[0]);
  const dateKey = headers.find((h) => h.includes("日付")) ?? headers[0];
  const memoKey = headers.find((h) => h.includes("摘要内容")) ?? headers.find((h) => h.includes("摘要")) ?? headers[1];
  const expenseKey = headers.find((h) => h.includes("支払") || h.includes("出金")) ?? headers[2];
  const incomeKey = headers.find((h) => h.includes("預かり") || h.includes("入金")) ?? headers[3];

  const result: MufgRow[] = [];

  for (const row of rawRows) {
    const dateStr = row[dateKey];
    const description = (row[memoKey] ?? "").trim();
    const expenseStr = row[expenseKey] ?? "";
    const incomeStr = row[incomeKey] ?? "";

    if (!dateStr) continue;
    if (isCreditCardPayment(description)) continue;
    if (/チャージ|charge/i.test(description)) continue;

    const date = parseDate(dateStr);
    if (!date) continue;

    const expenseAmt = parseAmount(expenseStr);
    const incomeAmt = parseAmount(incomeStr);
    if (expenseAmt === 0 && incomeAmt === 0) continue;

    const amount = expenseAmt > 0 ? expenseAmt : -incomeAmt;
    result.push({ date, description: description || "三菱UFJ", amount });
  }

  return result;
}
