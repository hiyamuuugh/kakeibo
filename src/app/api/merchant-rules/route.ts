import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalize } from "@/lib/normalize";

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

  // 既存取引へ一括適用。半角/全角の差を吸収するため normalize して部分一致を判定する
  // （DBの contains は正規化できないため、取得してアプリ側でマッチする）
  const key = normalize(merchant);
  const targets = await prisma.transaction.findMany({ select: { id: true, description: true } });
  const matchedIds = targets
    .filter((t) => normalize(t.description).includes(key))
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
