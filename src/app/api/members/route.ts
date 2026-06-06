import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const members = await prisma.member.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const { name, color, emoji } = await req.json();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const member = await prisma.member.create({
    data: { name, color: color ?? "#3b82f6", emoji: emoji ?? "🙂" },
  });
  return NextResponse.json(member, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  await prisma.member.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
