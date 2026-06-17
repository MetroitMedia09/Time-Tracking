import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";

// Routes that never require auth.
const PUBLIC_PATHS = ["/login", "/signup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isPublicPage = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Logged-in users shouldn't see login/signup — send them to the app.
  if (isPublicPage && session) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Protect everything else handled by this matcher.
  if (!isPublicPage && !session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Run on app pages + data APIs, but NOT on:
//  - /shared/* (public report links)
//  - /api/auth/* (login/signup/logout)
//  - static assets / _next
export const config = {
  matcher: [
    "/",
    "/reports/:path*",
    "/login",
    "/signup",
    "/api/entries/:path*",
    "/api/projects/:path*",
    "/api/reports/:path*",
    "/api/shares/:path*",
  ],
};
