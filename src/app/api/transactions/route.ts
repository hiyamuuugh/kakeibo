import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month");
  const categoryId = searchParams.get("categoryId");
  const memberId = searchParams.get("memberId"); // "all" or specific id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (month) {
    const [year, m] = month.split("-").map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 1);
    where.date = { gte: start, lt: end };
  }

  if (categoryId === "uncategorized") {
    where.categoryId = null;
  } else if (categoryId) {
    where.categoryId = categoryId;
  }

  if (memberId && memberId !== "all") {
    where.memberId = memberId;
  }
  // 家族全員取得時も非公開データを返す（合計に算入するため）。
  // リスト表示での非表示はクライアント側で行う。

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true, member: true },
    orderBy: { date: "desc" },
    take: 500,
  });

  return NextResponse.json(transactions);
}

export async function DELETE() {
  const { count } = await prisma.transaction.deleteMany({});
  return NextResponse.json({ deleted: count });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { date, amount, description, store, source, categoryId, memberId } = body;

  const transaction = await prisma.transaction.create({
    data: {
      date: new Date(date),
      amount: Number(amount),
      description,
      store: store ?? null,
      source: source ?? "manual",
      categoryId: categoryId ?? null,
      memberId: memberId ?? null,
    },
    include: { category: true },
  });

  return NextResponse.json(transaction, { status: 201 });
}
