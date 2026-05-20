import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

interface PayPayRow {
  [key: string]: string;
}

function parsePayPayDate(dateStr: string): Date | null {
  // PayPay CSV: "2024/01/15 12:34:56" or "2024/01/15"
  const cleaned = dateStr.trim().replace(/\//g, "-");
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

function parseAmount(amountStr: string): number {
  return Math.abs(parseInt(amountStr.replace(/[^0-9\-]/g, ""), 10) || 0);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const text = await file.text();

  // Auto-detect encoding issue: PayPay CSV may be Shift-JIS encoded
  // We parse the text as-is (browser should handle encoding)
  let rows: PayPayRow[] = [];
  let parseErrors: Papa.ParseError[] = [];

  Papa.parse<PayPayRow>(text, {
    header: true,
    skipEmptyLines: true,
    complete(result) {
      rows = result.data;
      parseErrors = result.errors;
    },
  });

  if (parseErrors.length > 0 && rows.length === 0) {
    return NextResponse.json(
      { error: "CSV parse failed", details: parseErrors },
      { status: 400 }
    );
  }
  if (rows.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0 });
  }

  // Detect column names (PayPay CSV headers vary by export type)
  const headers = Object.keys(rows[0]);
  const dateKey = headers.find((h) => h.includes("日時") || h.includes("日付") || h.toLowerCase().includes("date")) ?? headers[0];
  const amountKey = headers.find((h) => h.includes("金額") || h.toLowerCase().includes("amount")) ?? headers[1];
  const descKey = headers.find((h) => h.includes("内容") || h.includes("店舗") || h.toLowerCase().includes("desc") || h.toLowerCase().includes("name")) ?? headers[2];

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const dateStr = row[dateKey];
    const amountStr = row[amountKey];
    const description = (row[descKey] ?? "").trim();

    if (!dateStr || !amountStr) {
      skipped++;
      continue;
    }

    const date = parsePayPayDate(dateStr);
    if (!date) {
      skipped++;
      continue;
    }

    const amount = parseAmount(amountStr);
    if (amount === 0) {
      skipped++;
      continue;
    }

    // Skip income rows (positive values in PayPay are charges TO the account)
    // PayPay typically shows payments as negative or has a "支払い" type
    const typeKey = headers.find((h) => h.includes("種別") || h.includes("タイプ") || h.toLowerCase().includes("type"));
    if (typeKey) {
      const type = (row[typeKey] ?? "").trim();
      if (type.includes("チャージ") || type.includes("受取")) {
        skipped++;
        continue;
      }
    }

    // Store name (may be in a separate column)
    const storeKey = headers.find((h) => h.includes("店") && h !== descKey);
    const store = storeKey ? (row[storeKey] ?? "").trim() || null : null;

    await prisma.transaction.create({
      data: {
        date,
        amount,
        description: description || "PayPay支払い",
        store,
        source: "paypay",
      },
    });

    imported++;
  }

  return NextResponse.json({ imported, skipped });
}
