import { signJwt, verifyJwt } from "./jwt.js";

export interface SessionCookieSignOptions {
  secret: string;
  maxAgeSeconds?: number;
}

export interface SessionCookieAttributes {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  maxAge: number;
  secure: boolean;
}

export const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function getSessionCookieAttributes(
  maxAgeSeconds: number = DEFAULT_SESSION_MAX_AGE_SECONDS
): SessionCookieAttributes {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function signSessionValue(
  userId: string,
  options: SessionCookieSignOptions
): Promise<string> {
  return signJwt(
    { userId },
    options.secret,
    options.maxAgeSeconds ?? DEFAULT_SESSION_MAX_AGE_SECONDS
  );
}

export async function verifySessionValue(
  value: string,
  secret: string
): Promise<string | null> {
  const data = await verifyJwt(value, secret);
  if (!data) {
    return null;
  }
  return typeof data.userId === "string" ? data.userId : null;
}
