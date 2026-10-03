import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decodeBuffer, parseMufgCsv } from "@/lib/import/mufg";
import { findMatchingRuleCategoryId } from "@/lib/merchant-rule-match";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const memberId = (formData.get("memberId") as string | null) || null;

  const buffer = await file.arrayBuffer();
  const decoded = decodeBuffer(buffer);
  const rows = parseMufgCsv(decoded);

  if (rows.length === 0) return NextResponse.json({ imported: 0, skipped: 0 });

  const merchantRules = await prisma.merchantRule.findMany({ include: { category: true } });

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const existing = await prisma.transaction.findFirst({
      where: { date: row.date, amount: row.amount, description: row.description, source: "mufg", memberId },
      select: { id: true },
    });
    if (existing) { skipped++; continue; }

    const ruleCategory = findMatchingRuleCategoryId(row.description, merchantRules, row.amount);

    await prisma.transaction.create({
      data: {
        date: row.date,
        amount: row.amount,
        description: row.description,
        store: null,
        source: "mufg",
        categoryId: ruleCategory,
        memberId,
      },
    });

    imported++;
  }

  return NextResponse.json({ imported, skipped });
}
