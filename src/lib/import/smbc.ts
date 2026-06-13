import Papa from "papaparse";
import { isCreditCardPayment } from "./mufg";

export interface SmbcRow {
  date: Date;
  description: string;
  amount: number;
}

export function decodeBuffer(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8").decode(buffer).replace(/^﻿/, "");
  if (utf8.includes("年月日") || utf8.includes("お取り扱い内容")) return utf8;
  try {
    const sjis = new TextDecoder("shift_jis").decode(buffer);
    if (sjis.includes("年月日") || sjis.includes("お取り扱い内容")) return sjis;
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

export function parseSmbcCsv(csvText: string): SmbcRow[] {
  // 「年月日」を含む行をヘッダーとして自動検出
  const lines = csvText.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => l.includes("年月日"));
  const text = headerIdx >= 0 ? lines.slice(headerIdx).join("\n") : csvText;

  let rawRows: Record<string, string>[] = [];
  Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    complete(result) { rawRows = result.data; },
  });

  if (rawRows.length === 0) return [];

  const headers = Object.keys(rawRows[0]);
  const dateKey = headers.find((h) => h.includes("年月日")) ?? headers[0];
  const expenseKey = headers.find((h) => h.includes("お引出し") || h.includes("引出")) ?? headers[1];
  const incomeKey = headers.find((h) => h.includes("お預入れ") || h.includes("預入")) ?? headers[2];
  const memoKey = headers.find((h) => h.includes("お取り扱い内容") || h.includes("内容")) ?? headers[3];

  const result: SmbcRow[] = [];

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
    result.push({ date, description: description || "三井住友銀行", amount });
  }

  return result;
}
