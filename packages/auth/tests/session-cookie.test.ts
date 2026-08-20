import { describe, expect, it } from "vitest";
import {
  getSessionCookieAttributes,
  signSessionValue,
  verifySessionValue,
} from "../src//session-cookie.js";

describe("Session Cookie", () => {
  const secret = "test-cookie-secret-that-is-long-enough-32-chars";
  const userId = "123e4567-e89b-12d3-a456-426614174000";

  it("signs and verifies a session value", async () => {
    const value = await signSessionValue(userId, { secret });

    expect(value.split(".").length).toBe(3);
    expect(await verifySessionValue(value, secret)).toBe(userId);
  });

  it("rejects a tampered session value", async () => {
    const value = await signSessionValue(userId, { secret });
    const parts = value.split(".");
    const forged = `${parts[0]}.${parts[1]}.tampered-signature`;

    expect(await verifySessionValue(forged, secret)).toBeNull();
  });

  it("rejects a session value signed with a different secret", async () => {
    const value = await signSessionValue(userId, { secret });

    expect(
      await verifySessionValue(value, "different-cookie-secret-also-long-enough")
    ).toBeNull();
  });

  it("rejects an expired session value", async () => {
    const value = await signSessionValue(userId, { secret, maxAgeSeconds: -1 });

    expect(await verifySessionValue(value, secret)).toBeNull();
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
