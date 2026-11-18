import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { japanToday } from "@/lib/cash-flow";
import { validBirthDate } from "@/lib/profile-age";

export async function GET() {
  const members = await prisma.member.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(members, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const { name, color, emoji, birthDate } = await req.json();
  if (birthDate !== undefined && birthDate !== null && birthDate !== "" && !validBirthDate(birthDate, japanToday())) return NextResponse.json({ error: "生年月日を確認してください。" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const member = await prisma.member.create({
    data: { name, color: color ?? "#3b82f6", emoji: emoji ?? "🙂", ...(birthDate ? { birthDate: new Date(birthDate + "T00:00:00.000Z") } : {}) },
  });
  return NextResponse.json(member, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  await prisma.member.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
