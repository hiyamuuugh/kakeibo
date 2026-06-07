import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

interface RakutenRow {
  [key: string]: string;
}

function decodeBuffer(buffer: ArrayBuffer): string {
  // UTF-8（BOM付き含む）で試みる
  const utf8 = new TextDecoder("utf-8").decode(buffer).replace(/^﻿/, "");
  if (utf8.includes("利用日") || utf8.includes("利用店名")) return utf8;

  // Shift-JIS で試みる
  try {
    const sjis = new TextDecoder("shift_jis").decode(buffer);
    if (sjis.includes("利用日") || sjis.includes("利用店名")) return sjis;
  } catch {
    // 未対応環境はスキップ
  }

  return utf8;
}

function parseDate(dateStr: string): Date | null {
  const cleaned = dateStr.trim().replace(/\//g, "-");
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

  // 「利用日」を含む行をヘッダーとして自動検出（先頭に説明行がある場合に対応）
  const lines = decoded.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => l.includes("利用日"));
  const csvText = headerIdx > 0 ? lines.slice(headerIdx).join("\n") : decoded;

  let rows: RakutenRow[] = [];
  let parseErrors: Papa.ParseError[] = [];

  Papa.parse<RakutenRow>(csvText, {
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

  const merchantRules = await prisma.merchantRule.findMany();
  const ruleMap = new Map(merchantRules.map((r) => [r.merchant.toLowerCase(), r.categoryId]));

  const headers = Object.keys(rows[0]);

  const dateKey = headers.find((h) => h.includes("利用日")) ?? headers[0];
  const merchantKey = headers.find((h) => h.includes("利用店名") || h.includes("商品名")) ?? headers[1];
  // 「利用金額(円)」「利用金額」どちらにも対応
  const amountKey = headers.find((h) => h.includes("利用金額")) ?? headers[4];

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const dateStr = row[dateKey];
    const merchant = (row[merchantKey] ?? "").trim();
    const amountStr = row[amountKey] ?? "";

    if (!dateStr || !amountStr) { skipped++; continue; }

    const date = parseDate(dateStr);
    if (!date) { skipped++; continue; }

    const amount = parseAmount(amountStr);
    if (amount === 0) { skipped++; continue; }

    const lower = merchant.toLowerCase();
    const ruleCategory = [...ruleMap.entries()].find(([key]) => lower.includes(key))?.[1] ?? null;

    await prisma.transaction.create({
      data: {
        date,
        amount,
        description: merchant || "楽天カード",
        store: null,
        source: "rakuten",
        categoryId: ruleCategory,
        memberId,
      },
    });

    imported++;
  }

  return NextResponse.json({ imported, skipped });
}
