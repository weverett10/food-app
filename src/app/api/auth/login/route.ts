import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  isLockedOut,
  recordFailedLogin,
  clearLoginAttempts,
} from "@/lib/auth";

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    if (isLockedOut(ip)) {
      return NextResponse.json(
        { error: "Too many attempts. Try again in a few minutes." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const password = body?.password;

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const passwordHash = process.env.APP_PASSWORD_HASH;
    if (!passwordHash) {
      return NextResponse.json(
        { error: "Server is not configured" },
        { status: 500 }
      );
    }

    const isMatch = await bcrypt.compare(password, passwordHash);

    if (!isMatch) {
      recordFailedLogin(ip);
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    clearLoginAttempts(ip);

    const token = signSessionToken();
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }
}
