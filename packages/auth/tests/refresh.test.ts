import { describe, expect, it } from "vitest";
import {
  DEFAULT_REFRESH_TOKEN_MAX_AGE_SECONDS,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiresAt,
} from "../src/refresh.js";

describe("Refresh token service", () => {
  it("mints opaque, high-entropy tokens that do not repeat", () => {
    const first = generateRefreshToken();
    const second = generateRefreshToken();

    expect(typeof first).toBe("string");
    expect(first.length).toBeGreaterThanOrEqual(32);
    expect(first).not.toBe(second);
  });

  it("hashes deterministically and never returns the token itself", () => {
    const token = generateRefreshToken();
    const hash = hashRefreshToken(token);

    expect(hashRefreshToken(token)).toBe(hash);
    expect(hash).not.toBe(token);
    expect(hash).not.toContain(token);
  });

  it("produces distinct hashes for distinct tokens", () => {
    expect(hashRefreshToken(generateRefreshToken())).not.toBe(
      hashRefreshToken(generateRefreshToken())
    );
  });

  it("expires in the future by the default max age", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const expiry = refreshTokenExpiresAt(undefined, now);

    expect(expiry.getTime()).toBe(
      now.getTime() + DEFAULT_REFRESH_TOKEN_MAX_AGE_SECONDS * 1000
    );
  });
});
