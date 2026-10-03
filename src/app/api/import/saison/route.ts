import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decodeSaisonBuffer, parseSaisonCsv } from "@/lib/import/saison";
import { findMatchingRuleCategoryId } from "@/lib/merchant-rule-match";
import { isImportExcluded } from "@/lib/import-exclusion";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const memberId = (formData.get("memberId") as string | null) || null;
  const rows = parseSaisonCsv(decodeSaisonBuffer(await file.arrayBuffer()));
  if (rows.length === 0) return NextResponse.json({ imported: 0, skipped: 0 });

  const merchantRules = await prisma.merchantRule.findMany({ include: { category: true } });
  const exclusions = await prisma.importExclusion.findMany({ select: { name: true } });
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    if (isImportExcluded(row.description, exclusions)) {
      skipped++;
      continue;
    }
    const existing = await prisma.transaction.findFirst({
      where: { date: row.date, amount: row.amount, description: row.description, source: "saison", memberId },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const categoryId = findMatchingRuleCategoryId(row.description, merchantRules, row.amount);
    await prisma.transaction.create({
      data: {
        date: row.date,
        amount: row.amount,
        description: row.description,
        store: null,
        source: "saison",
        categoryId,
        memberId,
      },
    });
    imported++;
  }

  return NextResponse.json({ imported, skipped });
}
