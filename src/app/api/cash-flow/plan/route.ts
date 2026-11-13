import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defaultCashPlan, parseCashPlan } from "@/lib/cash-flow-plan";

export async function GET() {
  try {
    const saved = await prisma.cashFlowPlan.findUnique({ where: { scope: "family" } });
    return NextResponse.json({ plan: saved ? parseCashPlan(saved.data) : defaultCashPlan(), updatedAt: saved?.updatedAt ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "シミュレーション設定を読み込めませんでした。" }, { status: 503 }); }
}
export async function PUT(req: Request) {
  let plan;
  try { plan = parseCashPlan(await req.json()); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "入力内容を確認してください。" }, { status: 400 }); }
  try {
    // One family-wide row. Every save replaces the full plan; the last DB write wins.
    const saved = await prisma.cashFlowPlan.upsert({ where: { scope: "family" }, create: { scope: "family", data: JSON.parse(JSON.stringify(plan)) }, update: { data: JSON.parse(JSON.stringify(plan)) } });
    return NextResponse.json({ plan: parseCashPlan(saved.data), updatedAt: saved.updatedAt });
  } catch { return NextResponse.json({ error: "設定を保存できませんでした。もう一度お試しください。" }, { status: 503 }); }
}
