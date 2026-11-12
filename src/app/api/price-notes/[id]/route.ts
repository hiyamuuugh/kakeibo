import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
