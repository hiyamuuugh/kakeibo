import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findMatchingRuleCategoryId } from "@/lib/merchant-rule-match";

// 登録済みの全ルールを既存取引に再適用する。
// 摘要は半角カナ・空白区切りで保存されるため、normalize（空白除去込み）で部分一致を判定する。
export async function POST() {
  const rules = await prisma.merchantRule.findMany({ include: { category: true } });

  const txs = await prisma.transaction.findMany({ select: { id: true, description: true, amount: true, categoryId: true } });

  const updates: { id: string; categoryId: string }[] = [];
  for (const t of txs) {
    const hit = findMatchingRuleCategoryId(t.description, rules, t.amount);
    if (hit && t.categoryId !== hit) {
      updates.push({ id: t.id, categoryId: hit });
    }
  }

  for (const u of updates) {
    await prisma.transaction.update({ where: { id: u.id }, data: { categoryId: u.categoryId } });
  }

  return NextResponse.json({ appliedCount: updates.length });
}
