import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { japanToday } from "@/lib/cash-flow";
import { csvImportScope } from "@/lib/csv-import-status";

export async function POST(req: Request) {
  let memberId: string, month: string;
  try {
    const body = await req.json();
    if (!body || typeof body.memberId !== "string" || !body.memberId || body.memberId.length > 120) throw new Error("アカウントを確認してください。");
    if (body.month !== japanToday().slice(0, 7)) throw new Error("月が変わりました。画面を更新してください。");
    memberId = body.memberId; month = body.month;
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "入力内容を確認してください。" }, { status: 400 }); }
  try {
    if (memberId !== "unassigned" && !await prisma.member.findUnique({ where: { id: memberId }, select: { id: true } })) return NextResponse.json({ error: "アカウントが見つかりません。" }, { status: 400 });
    const memberScope = csvImportScope(memberId === "unassigned" ? null : memberId);
    await prisma.csvReminderAcknowledgement.upsert({
      where: { memberScope_month: { memberScope, month } },
      create: { memberScope, month }, update: {},
    });
    return NextResponse.json({ acknowledged: true, month }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "取込済の状態を保存できませんでした。もう一度お試しください。" }, { status: 503 }); }
}
