import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  isAuthConfigured,
  verifySessionToken,
} from "@/lib/auth";

const PUBLIC_PATHS = new Set([
  "/login",
  "/manifest.webmanifest",
  "/favicon.ico",
]);

const PUBLIC_PREFIXES = ["/_next/", "/api/auth/", "/icon", "/apple-icon"];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.has(pathname) ||
  PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (pathname === "/login" && (await verifySessionToken(token))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!isAuthConfigured()) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "setup");

    return NextResponse.redirect(loginUrl);
  }

  if (await verifySessionToken(token)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/api/:path*"],
};
