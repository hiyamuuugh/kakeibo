import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

  const merchantRules = await prisma.merchantRule.findMany();
  const ruleMap = new Map(merchantRules.map((r) => [r.merchant.toLowerCase(), r.categoryId]));

  const headers = Object.keys(rows[0]);

  // PayPayカードCSVのヘッダー（複数パターンに対応）
  const dateKey = headers.find((h) => h.includes("ご利用日") || h.includes("利用日")) ?? headers[0];
  const merchantKey = headers.find((h) => h.includes("ご利用店名") || h.includes("利用店名") || h.includes("加盟店")) ?? headers[1];
  const amountKey = headers.find((h) => h.includes("ご利用金額") || h.includes("利用金額")) ?? headers[3];

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
        description: merchant || "PayPayカード",
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
