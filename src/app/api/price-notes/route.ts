import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePriceInput } from "@/lib/price-notes";

export async function GET() {
  try {
    const products = await prisma.priceProduct.findMany({ include: { records: { orderBy: [{ date: "desc" }, { createdAt: "desc" }] } }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(products, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "底値帖を読み込めませんでした。時間をおいて再試行してください。" }, { status: 503 });
  }
}
export async function POST(req: Request) {
  let data: ReturnType<typeof parsePriceInput>;
  try { data = parsePriceInput(await req.json()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "入力内容を確認してください。" }, { status: 400 }); }
  try {
    const { name, category, unit, date, ...record } = data;
    const product = await prisma.priceProduct.upsert({
      where: { name_category_unit: { name, category, unit } },
      create: { name, category, unit, records: { create: { ...record, date: new Date(date) } } },
      update: { records: { create: { ...record, date: new Date(date) } } },
      include: { records: { orderBy: [{ date: "desc" }, { createdAt: "desc" }] } },
    });
    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json({ error: "保存できませんでした。もう一度お試しください。" }, { status: 503 });
  }
}
