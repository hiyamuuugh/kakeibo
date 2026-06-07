import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

interface RakutenRow {
  [key: string]: string;
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

  const text = await file.text();
  let rows: RakutenRow[] = [];
  let parseErrors: Papa.ParseError[] = [];

  Papa.parse<RakutenRow>(text, {
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
  // 楽天カードは「利用金額(円)」「利用金額」のどちらかの形式
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
        source: "credit",
        categoryId: ruleCategory,
        memberId,
      },
    });

    imported++;
  }

  return NextResponse.json({ imported, skipped });
}
