import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePriceInput } from "@/lib/price-notes";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.$transaction(async (tx) => {
      const record = await tx.priceRecord.findUnique({ where: { id } });
      if (!record) return;
      await tx.priceRecord.delete({ where: { id } });
      // Keep the product identity to avoid racing with a simultaneous new record.
    });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "削除できませんでした。" }, { status: 503 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let input: ReturnType<typeof parsePriceInput>;
  try { input = parsePriceInput(await req.json()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "入力内容を確認してください。" }, { status: 400 }); }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.priceRecord.findUnique({ where: { id } });
      if (!existing) return null;
      const { name, category, unit, date, ...record } = input;
      const target = await tx.priceProduct.upsert({
        where: { name_category_unit: { name, category, unit } },
        create: { name, category, unit }, update: {},
      });
      await tx.priceRecord.update({ where: { id }, data: { ...record, date: new Date(date), productId: target.id } });
      const product = await tx.priceProduct.findUnique({
        where: { id: target.id }, include: { records: { orderBy: [{ date: "desc" }, { createdAt: "desc" }] } },
      });
      return { product, previousProductId: existing.productId };
    });
    if (!result) return NextResponse.json({ error: "この記録は見つかりませんでした。再読み込みしてください。" }, { status: 404 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "更新できませんでした。もう一度お試しください。" }, { status: 503 });
  }
}
