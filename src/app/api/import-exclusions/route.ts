import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const exclusions = await prisma.importExclusion.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(exclusions);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { name?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  try {
    const exclusion = await prisma.importExclusion.create({ data: { name } });
    return NextResponse.json(exclusion, { status: 201 });
  } catch {
    return NextResponse.json({ error: "同じ除外名が登録されています" }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest) {
  const body = (await req.json()) as { id?: unknown };
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await prisma.importExclusion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
