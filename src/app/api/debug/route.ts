import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.DATABASE_URL;
  return NextResponse.json({
    hasUrl: !!url,
    length: url?.length ?? 0,
    prefix: url?.substring(0, 14) ?? "undefined",
  });
}
