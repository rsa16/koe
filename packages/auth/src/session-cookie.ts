import { createHmac, timingSafeEqual } from "node:crypto";

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

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

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

export function signSessionValue(
  userId: string,
  options: SessionCookieSignOptions
): string {
  const expiresAt =
    Math.floor(Date.now() / 1000) + (options.maxAgeSeconds ?? DEFAULT_SESSION_MAX_AGE_SECONDS);
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt })).toString("base64url");
  return `${payload}.${sign(payload, options.secret)}`;
}

export function verifySessionValue(
  value: string,
  secret: string
): string | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = sign(payload, secret);
  if (signature.length !== expectedSignature.length) {
    return null;
  }
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      userId?: unknown;
      expiresAt?: unknown;
    };
    if (typeof parsed.userId !== "string") {
      return null;
    }
    if (typeof parsed.expiresAt !== "number" || Date.now() / 1000 > parsed.expiresAt) {
      return null;
    }
    return parsed.userId;
  } catch {
    return null;
  }
}
