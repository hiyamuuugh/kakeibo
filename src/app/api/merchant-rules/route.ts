import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findMatchingRuleCategoryId } from "@/lib/merchant-rule-match";

export async function GET() {
  const rules = await prisma.merchantRule.findMany({
    include: { category: true },
    orderBy: { merchant: "asc" },
  });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const { merchant, categoryId } = await req.json();
  if (!merchant || !categoryId) {
    return NextResponse.json({ error: "merchant and categoryId are required" }, { status: 400 });
  }

  const rule = await prisma.merchantRule.upsert({
    where: { merchant },
    update: { categoryId },
    create: { merchant, categoryId },
    include: { category: true },
  });

  // 既存取引へ一括適用し、収支種別とカテゴリ種別も照合する。
  const targets = await prisma.transaction.findMany({ select: { id: true, description: true, amount: true } });
  const matchedIds = targets
    .filter((t) => findMatchingRuleCategoryId(t.description, [rule], t.amount) === categoryId)
    .map((t) => t.id);

  let count = 0;
  if (matchedIds.length > 0) {
    const res = await prisma.transaction.updateMany({
      where: { id: { in: matchedIds } },
      data: { categoryId },
    });
    count = res.count;
  }

  return NextResponse.json({ ...rule, appliedCount: count }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  await prisma.merchantRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
