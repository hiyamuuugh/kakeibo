import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month");

  if (!month) {
    return NextResponse.json({ error: "month required" }, { status: 400 });
  }

  const [year, m] = month.split("-").map(Number);
  const start = new Date(year, m - 1, 1);
  const end = new Date(year, m, 1);

  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: start, lt: end } },
    include: { category: true },
  });

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);

  // Group by category
  const byCategory = new Map<
    string,
    { id: string; name: string; color: string; icon: string; total: number; count: number }
  >();

  for (const t of transactions) {
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

  // Daily totals for line chart
  const dailyMap = new Map<string, number>();
  for (const t of transactions) {
    const day = t.date.toISOString().slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + t.amount);
  }
  const daily = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));

  return NextResponse.json({ month, total, categories, daily, count: transactions.length });
}
