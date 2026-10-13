import crypto from "node:crypto";

/** How long a refresh token stays usable before the member must sign in again. */
export const DEFAULT_REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Mints an opaque, high-entropy refresh token. The token is never stored as-is:
 * only its hash is persisted, mirroring password storage.
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** Stable, non-reversible fingerprint of a refresh token for storage/lookup. */
export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Absolute expiry for a refresh token issued now. */
export function refreshTokenExpiresAt(
  maxAgeSeconds: number = DEFAULT_REFRESH_TOKEN_MAX_AGE_SECONDS,
  now: Date = new Date()
): Date {
  return new Date(now.getTime() + maxAgeSeconds * 1000);
}
