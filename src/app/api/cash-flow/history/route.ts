import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { japanToday } from "@/lib/cash-flow";
import { buildCashFlowHistory } from "@/lib/cash-flow-history";
export async function GET() {
  try {
    const today = japanToday(), end = new Date(today + "T00:00:00.000Z"); end.setUTCDate(end.getUTCDate() + 1);
    const entries = await prisma.transaction.findMany({ where: { date: { lt: end } }, select: { date: true, amount: true, category: { select: { name: true } } }, orderBy: { date: "asc" } });
    return NextResponse.json({ history: buildCashFlowHistory(entries, today) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "過去の家計簿を集計できませんでした。" }, { status: 503 }); }
}
