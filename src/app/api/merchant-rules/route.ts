import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  const [rule, { count }] = await prisma.$transaction([
    prisma.merchantRule.upsert({
      where: { merchant },
      update: { categoryId },
      create: { merchant, categoryId },
      include: { category: true },
    }),
    // 既存取引（description に merchant が含まれるもの）に一括適用
    prisma.transaction.updateMany({
      where: {
        description: { contains: merchant, mode: "insensitive" },
      },
      data: { categoryId },
    }),
  ]);

  return NextResponse.json({ ...rule, appliedCount: count }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  await prisma.merchantRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
