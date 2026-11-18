import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { japanToday, monthAt } from "@/lib/cash-flow";
import { buildCsvImportStatus, csvImportScope } from "@/lib/csv-import-status";
export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("memberId") ?? "unassigned";
  if (!input || input.length > 120) return NextResponse.json({ error: "アカウントを確認してください。" }, { status: 400 });
  const memberId = input === "unassigned" ? null : input;
  try {
    const today = japanToday(), current = today.slice(0, 7), first = monthAt(current, -6);
    const sources = ["paypay", "paypay_card", "paypay-card", "rakuten", "saison", "mufg", "smbc"];
    const [records, logs, used] = await Promise.all([
      prisma.transaction.findMany({ where: { memberId, source: { in: sources }, date: { gte: new Date(first + "-01T00:00:00.000Z"), lt: new Date(current + "-01T00:00:00.000Z") } }, select: { source: true, date: true } }),
      prisma.csvImportMonth.findMany({ where: { memberScope: csvImportScope(memberId) }, select: { source: true, month: true } }),
      prisma.transaction.groupBy({ by: ["source"], where: { memberId, source: { in: sources } } }),
    ]);
    return NextResponse.json(buildCsvImportStatus(today, records, logs, used.map(row => row.source)), { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "CSVの取り込み状況を確認できませんでした。" }, { status: 503 }); }
}
