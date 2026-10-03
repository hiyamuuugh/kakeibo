import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findMatchingRuleCategoryId } from "@/lib/merchant-rule-match";
import { isImportExcluded } from "@/lib/import-exclusion";
import Papa from "papaparse";

interface Row {
  [key: string]: string;
}

function decodeBuffer(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8").decode(buffer).replace(/^﻿/, "");
  if (utf8.includes("利用日") || utf8.includes("ご利用")) return utf8;
  try {
    const sjis = new TextDecoder("shift_jis").decode(buffer);
    if (sjis.includes("利用日") || sjis.includes("ご利用")) return sjis;
  } catch { /* 未対応環境はスキップ */ }
  return utf8;
}

function parseDate(dateStr: string): Date | null {
  const cleaned = dateStr
    .trim()
    .normalize("NFKC")
    .replace(/[年月]/g, "-")
    .replace(/日/g, "")
    .replace(/[/.]/g, "-");
  const parts = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (parts) {
    const [, year, month, day] = parts;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

function parseAmount(amountStr: string): number {
  return Math.abs(parseInt(amountStr.replace(/[^0-9]/g, ""), 10) || 0);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const memberId = (formData.get("memberId") as string | null) || null;

  const buffer = await file.arrayBuffer();
  const decoded = decodeBuffer(buffer);

  // ヘッダー行を自動検出（「利用日」を含む行から開始）
  const lines = decoded.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => l.includes("利用日") || l.includes("ご利用日"));
  const csvText = headerIdx > 0 ? lines.slice(headerIdx).join("\n") : decoded;

  let rows: Row[] = [];
  let parseErrors: Papa.ParseError[] = [];

  Papa.parse<Row>(csvText, {
    header: true,
    skipEmptyLines: true,
    complete(result) {
      rows = result.data;
      parseErrors = result.errors;
    },
  });

  if (parseErrors.length > 0 && rows.length === 0) {
    return NextResponse.json({ error: "CSV parse failed", details: parseErrors }, { status: 400 });
  }
  if (rows.length === 0) return NextResponse.json({ imported: 0, skipped: 0 });

  const merchantRules = await prisma.merchantRule.findMany({ include: { category: true } });
  const exclusions = await prisma.importExclusion.findMany({ select: { name: true } });

  const headers = Object.keys(rows[0]);
  const normalizedHeaders = headers.map((header) => [
    header,
    header.trim().normalize("NFKC").replace(/[\s　]/g, ""),
  ] as const);
  const findHeader = (predicate: (header: string) => boolean) =>
    normalizedHeaders.find(([, normalized]) => predicate(normalized))?.[0];

  // PayPayカードCSVのヘッダー（複数パターンに対応）
  const dateKey = findHeader((header) => header.includes("ご利用日") || header.includes("利用日")) ?? headers[0];
  const merchantKey = findHeader((header) => header.includes("ご利用店名") || header.includes("利用店名") || header.includes("加盟店")) ?? headers[1];
  const amountKey = findHeader((header) => header.includes("ご利用金額") || header.includes("利用金額")) ?? headers[3];

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const dateStr = row[dateKey];
    const merchant = (row[merchantKey] ?? "").trim();
    const amountStr = row[amountKey] ?? "";

    if (isImportExcluded(merchant, exclusions)) { skipped++; continue; }

    if (!dateStr || !amountStr) { skipped++; continue; }

    const date = parseDate(dateStr);
    if (!date) { skipped++; continue; }

    const amount = parseAmount(amountStr);
    if (amount === 0) { skipped++; continue; }

    const description = merchant || "PayPayカード";
    const existing = await prisma.transaction.findFirst({
      where: { date, amount, description, source: "paypay_card", memberId },
      select: { id: true },
    });
    if (existing) { skipped++; continue; }

    const ruleCategory = findMatchingRuleCategoryId(merchant, merchantRules, amount);

    await prisma.transaction.create({
      data: {
        date,
        amount,
        description,
        store: null,
        source: "paypay_card",
        categoryId: ruleCategory,
        memberId,
      },
    });

    imported++;
  }

  return NextResponse.json({ imported, skipped });
}
