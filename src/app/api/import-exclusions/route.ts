import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const exclusions = await prisma.importExclusion.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(exclusions);
  } catch {
    return NextResponse.json({ error: "CSV取込スキップワードを読み込めませんでした" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { name?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  try {
    const exclusion = await prisma.importExclusion.create({ data: { name } });
    return NextResponse.json(exclusion, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "同じワードが登録されています" }, { status: 409 });
    }
    return NextResponse.json({ error: "CSV取込スキップワードを登録できませんでした" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const body = (await req.json()) as { id?: unknown };
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await prisma.importExclusion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
