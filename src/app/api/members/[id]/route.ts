import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { japanToday } from "@/lib/cash-flow";
import { validBirthDate } from "@/lib/profile-age";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 }); }
  const { name, color, emoji, birthDate } = body ?? {};
  if (birthDate !== undefined && birthDate !== null && birthDate !== "" && !validBirthDate(birthDate, japanToday())) return NextResponse.json({ error: "生年月日を確認してください。" }, { status: 400 });
  try {
    const member = await prisma.member.update({ where: { id }, data: {
      ...(name !== undefined && { name }),
      ...(color !== undefined && { color }),
      ...(emoji !== undefined && { emoji }),
      ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate + "T00:00:00.000Z") : null }),
    } });
    return NextResponse.json(member);
  } catch { return NextResponse.json({ error: "プロフィールを保存できませんでした。" }, { status: 503 }); }
}
