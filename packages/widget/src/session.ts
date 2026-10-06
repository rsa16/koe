import { KoeApiError, KoeClient } from "@koe/sdk";

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

export async function ensureGuestSession(
  client: KoeClient,
  storage: TokenStorage
): Promise<string> {
  const stored = storage.getItem(ACCESS_TOKEN_KEY);
  if (stored) {
    try {
      await client.auth.me(stored);
      return stored;
    } catch {
      storage.removeItem(ACCESS_TOKEN_KEY);
    }
  }
  const response = await client.auth.anonymous();
  storage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
  return response.accessToken;
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

  async function resolve(): Promise<void> {
    const hostToken = options.hostToken();
    if (hostToken) {
      accessToken = hostToken;
      try {
        await options.client.auth.me(hostToken);
      } catch (err) {
        if (err instanceof KoeApiError && err.status === 401) {
          options.onExpired();
        }
        throw err;
      }
      return;
    }
    accessToken = await ensureGuestSession(options.client, options.storage);
  }

  async function runWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    return runWithAuthRetry(operation, async () => {
      if (options.hostToken()) {
        options.onExpired();
        return false;
      }
      options.storage.removeItem(ACCESS_TOKEN_KEY);
      accessToken = "";
      await resolve();
      return true;
    });
  }

  return {
    get accessToken() {
      return accessToken;
    },
    resolve,
    runWithRetry,
  };
}
