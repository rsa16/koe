import { createHmac, timingSafeEqual } from "node:crypto";

export interface OAuthStatePayload {
  state: string;
  codeVerifier: string;
  guestUserId?: string;
  expiresAt: number;
}

export const DEFAULT_OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signOAuthState(
  payload: Omit<OAuthStatePayload, "expiresAt">,
  secret: string,
  maxAgeSeconds: number = DEFAULT_OAUTH_STATE_MAX_AGE_SECONDS
): string {
  const data: OAuthStatePayload = {
    ...payload,
    expiresAt: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyOAuthState(
  value: string,
  secret: string
): OAuthStatePayload | null {
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expectedSignature = sign(encoded, secret);
  if (signature.length !== expectedSignature.length) {
    return null;
  }
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      state?: unknown;
      codeVerifier?: unknown;
      guestUserId?: unknown;
      expiresAt?: unknown;
    };
    if (typeof parsed.state !== "string" || typeof parsed.codeVerifier !== "string") {
      return null;
    }
    if (typeof parsed.expiresAt !== "number" || Date.now() / 1000 > parsed.expiresAt) {
      return null;
    }
    if (parsed.guestUserId !== undefined && typeof parsed.guestUserId !== "string") {
      return null;
    }
    return parsed as OAuthStatePayload;
  } catch {
    return null;
  }
}
