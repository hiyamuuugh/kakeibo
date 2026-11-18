import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { monthAt, validMonth } from "@/lib/cash-flow";
import { buildMonthlyStats, statsTransactionSelect } from "@/lib/monthly-stats";
export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month"), memberId = req.nextUrl.searchParams.get("memberId");
  if (!month || !validMonth(month)) return NextResponse.json({ error: "年月を確認してください。" }, { status: 400 });
  try {
    const transactions = await prisma.transaction.findMany({ where: { date: { gte: new Date(month + "-01T00:00:00.000Z"), lt: new Date(monthAt(month, 1) + "-01T00:00:00.000Z") }, ...(memberId && memberId !== "all" ? { memberId } : {}) }, select: statsTransactionSelect });
    return NextResponse.json(buildMonthlyStats(month, transactions), { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "月の集計を読み込めませんでした。" }, { status: 503 }); }
}
