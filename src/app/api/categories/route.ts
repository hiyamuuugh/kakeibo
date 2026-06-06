import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(categories);
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, color, icon } = body;
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const category = await prisma.category.create({
    data: { name, color: color ?? "#6b7280", icon: icon ?? "circle-ellipsis" },
  });
  return NextResponse.json(category, { status: 201 });
}
