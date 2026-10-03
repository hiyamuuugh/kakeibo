import Papa from "papaparse";

export interface SaisonRow {
  date: Date;
  description: string;
  amount: number;
}

export const decodeSaisonBuffer = (buffer: ArrayBuffer) => {
  const utf8 = new TextDecoder("utf-8").decode(buffer).replace(/^﻿/, "");
  if (utf8.includes("利用日") || utf8.includes("利用金額")) return utf8;

  try {
    return new TextDecoder("shift_jis").decode(buffer);
  } catch {
    return utf8;
  }
};

const parseDate = (value: string) => {
  const normalized = value.trim().normalize("NFKC").replace(/[年月]/g, "-").replace(/日/g, "").replace(/[/.]/g, "-");
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseAmount = (value: string) => Math.abs(Number.parseInt(value.replace(/[^0-9]/g, ""), 10) || 0);

export const parseSaisonCsv = (csvText: string): SaisonRow[] => {
  const lines = csvText.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.includes("利用日") && (line.includes("利用金額") || line.includes("支払金額")));
  const text = headerIndex >= 0 ? lines.slice(headerIndex).join("\n") : csvText;
  let rows: Record<string, string>[] = [];

  Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    complete(result) {
      rows = result.data;
    },
  });

  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  const normalizedHeaders = headers.map((header) => [
    header,
    header.trim().normalize("NFKC").replace(/[\s　]/g, ""),
  ] as const);
  const findHeader = (predicate: (header: string) => boolean) =>
    normalizedHeaders.find(([, normalized]) => predicate(normalized))?.[0];

  const dateKey = findHeader((header) => header.includes("利用日")) ?? headers[0];
  const descriptionKey =
    findHeader((header) => header.includes("ご利用店名及び商品名") || header.includes("利用店名") || header.includes("商品名")) ??
    headers[1];
  const amountKey =
    findHeader((header) => header.includes("利用金額") || header.includes("支払金額") || header.includes("請求金額")) ??
    headers[headers.length - 1];

  return rows.flatMap((row) => {
    const date = parseDate(row[dateKey] ?? "");
    const amount = parseAmount(row[amountKey] ?? "");
    if (!date || amount === 0) return [];
    return [{ date, description: (row[descriptionKey] ?? "").trim() || "セゾンカード", amount }];
  });
};
