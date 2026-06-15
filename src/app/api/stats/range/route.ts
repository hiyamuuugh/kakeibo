import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 取引の最古月(yyyy-MM)を返す。推移グラフ「全期間」表示の起点に使う。
export async function GET(req: NextRequest) {
  const memberId = req.nextUrl.searchParams.get("memberId");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (memberId && memberId !== "all") where.memberId = memberId;

  const oldest = await prisma.transaction.findFirst({
    where,
    orderBy: { date: "asc" },
    select: { date: true },
  });

  if (!oldest) return NextResponse.json({ earliestMonth: null });

  const d = oldest.date;
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return NextResponse.json({ earliestMonth: month });
}
