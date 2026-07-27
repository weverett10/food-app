import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const config = {
  runtime: "nodejs",
  matcher: [
    /*
     * Match all paths except:
     * - /login (the login page itself)
     * - /api/auth/* (login/logout endpoints)
     * - /_next (Next.js internals)
     * - static files (manifest, icons, service worker, etc.)
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-.*|icons/).*)",
  ],
};

export function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isValid = verifySessionToken(token);

  if (!isValid) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
