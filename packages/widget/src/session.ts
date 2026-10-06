import { KoeApiError, KoeClient } from "@koe/sdk";

export const ACCESS_TOKEN_KEY = "koe_access_token";
export const THEME_KEY = "koe_theme";

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

export async function runWithAuthRetry<T>(
  operation: () => Promise<T>,
  reauthenticate: () => Promise<void>
): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    if (err instanceof KoeApiError && err.status === 401) {
      await reauthenticate();
      return await operation();
    }
    throw err;
  }
}

export function readStoredTheme(storage: TokenStorage): "light" | "dark" | null {
  const stored = storage.getItem(THEME_KEY);
  return stored === "dark" || stored === "light" ? stored : null;
}

export function detectPreferredTheme(): "light" | "dark" {
  const prefersDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}
