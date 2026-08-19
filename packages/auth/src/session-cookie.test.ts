import { describe, it, expect } from "vitest";
import {
  getSessionCookieAttributes,
  signSessionValue,
  verifySessionValue,
} from "./session-cookie.js";

describe("Session Cookie", () => {
  const secret = "test-cookie-secret-that-is-long-enough-32-chars";
  const userId = "123e4567-e89b-12d3-a456-426614174000";

  it("signs and verifies a session value", () => {
    const value = signSessionValue(userId, { secret });

    expect(value.split(".").length).toBe(2);
    expect(verifySessionValue(value, secret)).toBe(userId);
  });

  it("rejects a tampered session value", () => {
    const value = signSessionValue(userId, { secret });
    const [payload] = value.split(".");
    const forged = `${payload}.tampered-signature`;

    expect(verifySessionValue(forged, secret)).toBeNull();
  });

  it("rejects a session value signed with a different secret", () => {
    const value = signSessionValue(userId, { secret });

    expect(
      verifySessionValue(value, "different-cookie-secret-also-long-enough")
    ).toBeNull();
  });

  it("rejects an expired session value", () => {
    const value = signSessionValue(userId, { secret, maxAgeSeconds: -1 });

    expect(verifySessionValue(value, secret)).toBeNull();
  });

  it("exposes SameSite=Lax HttpOnly cookie attributes for the admin UI", () => {
    const attributes = getSessionCookieAttributes();

    expect(attributes.httpOnly).toBe(true);
    expect(attributes.sameSite).toBe("lax");
    expect(attributes.path).toBe("/");
    expect(attributes.secure).toBe(false);
    expect(attributes.maxAge).toBe(60 * 60 * 24 * 7);
  });
});
