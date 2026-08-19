import { signJwt, verifyJwt } from "./jwt.js";

export type OAuthStatePayload = {
  state: string;
  codeVerifier: string;
  guestUserId?: string;
};

export const DEFAULT_OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

export async function signOAuthState(
  payload: OAuthStatePayload,
  secret: string,
  maxAgeSeconds: number = DEFAULT_OAUTH_STATE_MAX_AGE_SECONDS
): Promise<string> {
  return signJwt(payload, secret, maxAgeSeconds);
}

export async function verifyOAuthState(
  value: string,
  secret: string
): Promise<OAuthStatePayload | null> {
  const data = await verifyJwt(value, secret);
  if (!data) {
    return null;
  }
  if (typeof data.state !== "string" || typeof data.codeVerifier !== "string") {
    return null;
  }
  if (data.guestUserId !== undefined && typeof data.guestUserId !== "string") {
    return null;
  }
  return {
    state: data.state,
    codeVerifier: data.codeVerifier,
    ...(data.guestUserId !== undefined ? { guestUserId: data.guestUserId } : {}),
  };
}
