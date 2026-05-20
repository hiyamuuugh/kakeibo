import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month") ?? "";

  const budgets = await prisma.budget.findMany({
    where: month ? { month } : undefined,
    include: { category: true },
  });

  return NextResponse.json(budgets);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { month, categoryId, amount } = body;

  if (!month || !categoryId || amount === undefined) {
    return NextResponse.json({ error: "month, categoryId, amount required" }, { status: 400 });
  }

  const budget = await prisma.budget.upsert({
    where: { month_categoryId: { month, categoryId } },
    update: { amount: Number(amount) },
    create: { month, categoryId, amount: Number(amount) },
    include: { category: true },
  });

  return NextResponse.json(budget);
}
