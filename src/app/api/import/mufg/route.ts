import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decodeBuffer, parseMufgCsv } from "@/lib/import/mufg";
import { normalize } from "@/lib/normalize";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const memberId = (formData.get("memberId") as string | null) || null;

  const buffer = await file.arrayBuffer();
  const decoded = decodeBuffer(buffer);
  const rows = parseMufgCsv(decoded);

  if (rows.length === 0) return NextResponse.json({ imported: 0, skipped: 0 });

  const merchantRules = await prisma.merchantRule.findMany();
  const ruleMap = new Map(merchantRules.map((r) => [normalize(r.merchant), r.categoryId]));

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const existing = await prisma.transaction.findFirst({
      where: { date: row.date, amount: row.amount, description: row.description, source: "mufg" },
      select: { id: true },
    });
    if (existing) { skipped++; continue; }

    const lower = normalize(row.description);
    const ruleCategory = [...ruleMap.entries()].find(([key]) => lower.includes(key))?.[1] ?? null;

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
