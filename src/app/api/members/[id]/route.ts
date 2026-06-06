import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, color, emoji } = await req.json();
  const member = await prisma.member.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(color !== undefined && { color }),
      ...(emoji !== undefined && { emoji }),
    },
  });
  return NextResponse.json(member);
}
