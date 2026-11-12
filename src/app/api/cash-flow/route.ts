import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCashFlow, japanToday, referenceDate, validMonth } from "@/lib/cash-flow";

export async function GET(req: NextRequest) {
  const today = japanToday();
  const month = req.nextUrl.searchParams.get("month") ?? today.slice(0, 7);
  const memberId = req.nextUrl.searchParams.get("memberId") ?? "all";
  if (!validMonth(month) || month > today.slice(0, 7) || memberId.length > 120) return NextResponse.json({ error: "表示する月を確認してください。" }, { status: 400 });
  try {
    const end = new Date(`${referenceDate(month, today)}T00:00:00.000Z`); end.setUTCDate(end.getUTCDate() + 1);
    const transactions = await prisma.transaction.findMany({
      where: { date: { lt: end }, ...(memberId === "all" ? {} : { memberId: memberId === "unassigned" ? null : memberId }) },
      select: { date: true, amount: true, source: true }, orderBy: { date: "asc" },
    });
    return NextResponse.json(buildCashFlow(transactions, month, today), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "キャッシュフローを読み込めませんでした。もう一度お試しください。" }, { status: 503 });
  }
}
