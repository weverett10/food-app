import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;
const SESSION_COOKIE_NAME = "session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  authenticated: true;
  userId: string;
  iat: number;
  exp: number;
}

export function signSessionToken(userId: string): string {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.sign({ authenticated: true, userId }, JWT_SECRET, {
    expiresIn: SESSION_MAX_AGE_SECONDS,
  });
}

export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token || !JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionPayload;
    return decoded.authenticated === true && decoded.userId ? decoded.userId : null;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };

// --- Configured users (single shared password per person, no accounts/usernames) ---

export interface ConfiguredUser {
  userId: string;
  passwordHash: string;
}

export function getConfiguredUsers(): ConfiguredUser[] {
  const users: ConfiguredUser[] = [];
  if (process.env.APP_PASSWORD_HASH) {
    users.push({ userId: "user1", passwordHash: process.env.APP_PASSWORD_HASH });
  }
  if (process.env.APP_PASSWORD_HASH_2) {
    users.push({ userId: "user2", passwordHash: process.env.APP_PASSWORD_HASH_2 });
  }
  return users;
}

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
