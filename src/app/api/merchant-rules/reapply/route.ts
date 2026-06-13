import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalize } from "@/lib/normalize";

// 登録済みの全ルールを既存取引に再適用する。
// 摘要は半角カナ・空白区切りで保存されるため、normalize（空白除去込み）で部分一致を判定する。
export async function POST() {
  const rules = await prisma.merchantRule.findMany();
  const ruleMap = rules.map((r) => ({ key: normalize(r.merchant), categoryId: r.categoryId }));

  const txs = await prisma.transaction.findMany({ select: { id: true, description: true, categoryId: true } });

  const updates: { id: string; categoryId: string }[] = [];
  for (const t of txs) {
    const nd = normalize(t.description);
    const hit = ruleMap.find((r) => r.key && nd.includes(r.key));
    if (hit && t.categoryId !== hit.categoryId) {
      updates.push({ id: t.id, categoryId: hit.categoryId });
    }
  }

  for (const u of updates) {
    await prisma.transaction.update({ where: { id: u.id }, data: { categoryId: u.categoryId } });
  }

  return NextResponse.json({ appliedCount: updates.length });
}
