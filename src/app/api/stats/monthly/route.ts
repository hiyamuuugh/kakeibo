import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month");
  const memberId = searchParams.get("memberId");

  if (!month) {
    return NextResponse.json({ error: "month required" }, { status: 400 });
  }

  const [year, m] = month.split("-").map(Number);
  const start = new Date(year, m - 1, 1);
  const end = new Date(year, m, 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = { date: { gte: start, lt: end } };
  if (memberId && memberId !== "all") where.memberId = memberId;

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true },
  });

  const expenses = transactions.filter((t) => t.amount >= 0);
  const incomes = transactions.filter((t) => t.amount < 0);

  const total = expenses.reduce((sum, t) => sum + t.amount, 0);
  const income = incomes.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Group by category (支出のみ)
  const byCategory = new Map<
    string,
    { id: string; name: string; color: string; icon: string; total: number; count: number }
  >();

  for (const t of expenses) {
    const key = t.categoryId ?? "__uncategorized__";
    const existing = byCategory.get(key);
    if (existing) {
      existing.total += t.amount;
      existing.count += 1;
    } else {
      byCategory.set(key, {
        id: key,
        name: t.category?.name ?? "未分類",
        color: t.category?.color ?? "#9ca3af",
        icon: t.category?.icon ?? "circle-ellipsis",
        total: t.amount,
        count: 1,
      });
    }
  }

  const categories = Array.from(byCategory.values()).sort((a, b) => b.total - a.total);

  // Daily totals for line chart (支出のみ)
  const dailyMap = new Map<string, number>();
  for (const t of expenses) {
    const day = t.date.toISOString().slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + t.amount);
  }
  const daily = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));

  return NextResponse.json({ month, total, income, categories, daily, count: expenses.length });
}
