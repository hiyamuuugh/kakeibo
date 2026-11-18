import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isExpenseCategory } from "@/lib/category-options";
import { validMonth } from "@/lib/cash-flow";
import { budgetScope, emptyMonthlyBudget, parseMonthlyBudget } from "@/lib/monthly-budget";

function memberFromRequest(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("memberId");
  if (id !== null && (!id || id.length > 120)) throw new Error("予算の対象を確認してください。");
  return id === "all" ? null : id;
}
export async function GET(req: NextRequest) {
  let memberId: string | null;
  const month = req.nextUrl.searchParams.get("month");
  try { memberId = memberFromRequest(req); if (month !== null && !validMonth(month)) throw new Error("年月を確認してください。"); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }
  try {
    const saved = await prisma.monthlyBudgetPlan.findUnique({ where: { scope: budgetScope(memberId) } });
    const plan = saved ? parseMonthlyBudget(saved.data) : emptyMonthlyBudget();
    // Preserve existing family category budgets entered for a particular month.
    const overrides = month && !memberId ? await prisma.budget.findMany({ where: { month }, select: { categoryId: true, amount: true } }) : [];
    const effective = new Map(plan.categories.map(row => [row.categoryId, row]));
    for (const row of overrides) effective.set(row.categoryId, row);
    const effectivePlan = parseMonthlyBudget({ ...plan, categories: [...effective.values()] });
    const categoryNames = await prisma.category.findMany({ where: { id: { in: effectivePlan.categories.map(row => row.categoryId) } }, select: { id: true, name: true } });
    return NextResponse.json({ plan: effectivePlan, categoryNames, monthlyOverrides: overrides.length > 0 }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "毎月の予算を読み込めませんでした。" }, { status: 503 }); }
}
export async function PUT(req: NextRequest) {
  let memberId: string | null, plan;
  try { memberId = memberFromRequest(req); plan = parseMonthlyBudget(await req.json()); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "入力内容を確認してください。" }, { status: 400 }); }
  try {
    if (memberId && !await prisma.member.findUnique({ where: { id: memberId }, select: { id: true } })) return NextResponse.json({ error: "対象のアカウントが見つかりません。" }, { status: 400 });
    const categories = await prisma.category.findMany({ where: { id: { in: plan.categories.map(row => row.categoryId) } } });
    const allowed = new Set(categories.filter(isExpenseCategory).map(row => row.id));
    if (plan.categories.some(row => !allowed.has(row.categoryId))) return NextResponse.json({ error: "支出カテゴリを選択してください。" }, { status: 400 });
    const scope = budgetScope(memberId), data = JSON.parse(JSON.stringify(plan));
    await prisma.monthlyBudgetPlan.upsert({ where: { scope }, create: { scope, data }, update: { data } });
    return NextResponse.json({ plan });
  } catch { return NextResponse.json({ error: "毎月の予算を保存できませんでした。もう一度お試しください。" }, { status: 503 }); }
}
