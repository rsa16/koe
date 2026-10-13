import { KoeApiError, KoeClient, User } from "@koe/sdk";

export const ACCESS_TOKEN_KEY = "koe_access_token";

export const AUTH_EXPIRED_EVENT = "koe-auth-expired";

export interface AuthExpiredDetail {
  threadRef: string;
}

export interface TokenStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface GuestSession {
  accessToken: string;
  user: User;
}

export async function ensureGuestSession(
  client: KoeClient,
  storage: TokenStorage
): Promise<GuestSession> {
  const stored = storage.getItem(ACCESS_TOKEN_KEY);
  if (stored) {
    try {
      const user = await client.auth.me(stored);
      return { accessToken: stored, user };
    } catch {
      storage.removeItem(ACCESS_TOKEN_KEY);
    }
  }
  const response = await client.auth.anonymous();
  storage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
  return { accessToken: response.accessToken, user: response.user };
}

export function emitAuthExpired(
  target: EventTarget,
  threadRef: string
): void {
  target.dispatchEvent(
    new CustomEvent<AuthExpiredDetail>(AUTH_EXPIRED_EVENT, {
      detail: { threadRef },
      bubbles: true,
      composed: true,
    })
  );
}

async function runWithAuthRetry<T>(
  operation: () => Promise<T>,
  onUnauthorized: () => Promise<boolean> | boolean
): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    if (err instanceof KoeApiError && err.status === 401) {
      const shouldRetry = await onUnauthorized();
      if (shouldRetry) {
        return await operation();
      }
    }
    throw err;
  }
}

export interface AuthSession {
  readonly accessToken: string;
  readonly user: User | null;
  resolve(): Promise<void>;
  runWithRetry<T>(operation: () => Promise<T>): Promise<T>;
}

export interface AuthSessionOptions {
  client: KoeClient;
  storage: TokenStorage;
  hostToken: () => string;
  onExpired: () => void;
}

/**
 * Owns the token lifecycle for a widget. When the host supplies a token the
 * session never self-issues a guest and never silently re-anonymises: it
 * validates the token via `/auth/me`, and a `401` triggers `onExpired` instead
 * of a guest fallback. With no host token it keeps today's guest behaviour.
 */
export function createAuthSession(options: AuthSessionOptions): AuthSession {
  let accessToken = "";
  let currentUser: User | null = null;

  async function resolve(): Promise<void> {
    const hostToken = options.hostToken();
    if (hostToken) {
      accessToken = hostToken;
      try {
        currentUser = await options.client.auth.me(hostToken);
      } catch (err) {
        if (err instanceof KoeApiError && err.status === 401) {
          options.onExpired();
        }
        throw err;
      }
      return;
    }
    const guest = await ensureGuestSession(options.client, options.storage);
    accessToken = guest.accessToken;
    currentUser = guest.user;
  }

  async function runWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    return runWithAuthRetry(operation, async () => {
      if (options.hostToken()) {
        options.onExpired();
        return false;
      }
      options.storage.removeItem(ACCESS_TOKEN_KEY);
      accessToken = "";
      currentUser = null;
      await resolve();
      return true;
    });
  }

  return {
    get accessToken() {
      return accessToken;
    },
    get user() {
      return currentUser;
    },
    resolve,
    runWithRetry,
  };
}
