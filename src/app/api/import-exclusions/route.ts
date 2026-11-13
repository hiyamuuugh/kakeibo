import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { isCsvImportSource } from "@/lib/import-sources";

export async function GET() {
  try {
    const exclusions = await prisma.importExclusion.findMany({ orderBy: [{ source: "asc" }, { name: "asc" }] });
    return NextResponse.json(exclusions, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "CSV取込の除外名称を読み込めませんでした" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  let name: string, source: unknown;
  try {
    const body = await req.json();
    name = typeof body?.name === "string" ? body.name.trim() : "";
    source = body?.source;
  } catch { return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 }); }
  if (!name || name.length > 200 || !isCsvImportSource(source)) return NextResponse.json({ error: "名称（200文字以内）と取り込み元を確認してください" }, { status: 400 });

  try {
    const exclusion = await prisma.importExclusion.create({ data: { name, source } });
    return NextResponse.json(exclusion, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "この取り込み元には同じ名称が登録されています" }, { status: 409 });
    }
    return NextResponse.json({ error: "除外名称を登録できませんでした" }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest) {
  let id: string, source: unknown;
  try {
    const body = await req.json();
    id = typeof body?.id === "string" ? body.id : "";
    source = body?.source;
  } catch { return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 }); }
  if (!id || !isCsvImportSource(source)) return NextResponse.json({ error: "名称と取り込み元を確認してください" }, { status: 400 });
  try {
    const result = await prisma.importExclusion.deleteMany({ where: { id, source } });
    if (!result.count) return NextResponse.json({ error: "除外名称が見つかりません" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "除外名称を削除できませんでした" }, { status: 503 }); }
}
