import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { monthAt, validMonth } from "@/lib/cash-flow";
import { buildMonthlyRange, statsTransactionSelect } from "@/lib/monthly-stats";
export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from"), to = req.nextUrl.searchParams.get("to"), memberId = req.nextUrl.searchParams.get("memberId");
  if (!from || !to || !validMonth(from) || !validMonth(to) || to < from || (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5)) - Number(from.slice(5)) > 119 || (memberId !== null && (!memberId || memberId.length > 120))) return NextResponse.json({ error: "集計期間とアカウントを確認してください。" }, { status: 400 });
  try {
    const entries = await prisma.transaction.findMany({ where: { date: { gte: new Date(from + "-01T00:00:00.000Z"), lt: new Date(monthAt(to, 1) + "-01T00:00:00.000Z") }, ...(memberId && memberId !== "all" ? { memberId } : {}) }, select: statsTransactionSelect });
    return NextResponse.json({ months: buildMonthlyRange(from, to, entries) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "過去の集計を読み込めませんでした。" }, { status: 503 }); }
}
