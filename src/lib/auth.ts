import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const COOKIE_NAME = 'auth_token';
const JWT_SECRET  = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-change-in-production'
);

export interface JwtPayload {
  sub: string;       // profile id
  email: string;
  role: string;
  tenant_id: string | null;
}

// ── Sign ────────────────────────────────────────────────────────────────────
export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

// ── Verify ──────────────────────────────────────────────────────────────────
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

// ── Set cookie (server action / route handler) ───────────────────────────────
export async function setAuthCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   60 * 60 * 24 * 7, // 7 days
  });
}

// ── Clear cookie ─────────────────────────────────────────────────────────────
export async function clearAuthCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

// ── Get session from server (route handlers / server components) ─────────────
export async function getServerSession(): Promise<JwtPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ── Get session from NextRequest (middleware) ────────────────────────────────
export async function getSessionFromRequest(req: NextRequest): Promise<JwtPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}
