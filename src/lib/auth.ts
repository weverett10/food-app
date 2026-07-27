import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;
const SESSION_COOKIE_NAME = "session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  authenticated: true;
  iat: number;
  exp: number;
}

export function signSessionToken(): string {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.sign({ authenticated: true }, JWT_SECRET, {
    expiresIn: SESSION_MAX_AGE_SECONDS,
  });
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token || !JWT_SECRET) return false;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionPayload;
    return decoded.authenticated === true;
  } catch {
    return false;
  }
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };

// --- In-memory login rate limiting (single-instance, single-user scale) ---

interface LoginAttemptRecord {
  failedCount: number;
  lockedUntil: number | null;
}

const loginAttempts = new Map<string, LoginAttemptRecord>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function isLockedOut(ip: string): boolean {
  const record = loginAttempts.get(ip);
  if (!record || !record.lockedUntil) return false;
  if (Date.now() > record.lockedUntil) {
    loginAttempts.delete(ip);
    return false;
  }
  return true;
}

export function recordFailedLogin(ip: string): void {
  const record = loginAttempts.get(ip) ?? { failedCount: 0, lockedUntil: null };
  record.failedCount += 1;
  if (record.failedCount >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
  loginAttempts.set(ip, record);
}

export function clearLoginAttempts(ip: string): void {
  loginAttempts.delete(ip);
}
