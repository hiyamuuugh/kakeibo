import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  getSessionMaxAge,
  isAuthConfigured,
  isValidPassword,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "auth_not_configured" },
      { status: 503 }
    );
  }

  const body = (await request.json()) as { password?: unknown };
  const password =
    typeof body.password === "string" ? body.password.trim() : "";

  if (!(await isValidPassword(password))) {
    return NextResponse.json({ error: "invalid_password" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionMaxAge(),
  });

  return NextResponse.json({ ok: true });
}
