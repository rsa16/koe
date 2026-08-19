import { describe, it, expect } from "vitest";
import { signOAuthState, verifyOAuthState } from "./oauth-state.js";

describe("OAuth State", () => {
  const secret = "test-oauth-secret-that-is-long-enough-32-chars";
  const guestUserId = "123e4567-e89b-12d3-a456-426614174000";

  it("signs and verifies an OAuth state payload", () => {
    const value = signOAuthState(
      { state: "abc123", codeVerifier: "verifier-value" },
      secret
    );

    expect(value.split(".").length).toBe(2);
    const verified = verifyOAuthState(value, secret);
    expect(verified).not.toBeNull();
    expect(verified?.state).toBe("abc123");
    expect(verified?.codeVerifier).toBe("verifier-value");
    expect(verified?.guestUserId).toBeUndefined();
  });

  it("round-trips an optional guest user id", () => {
    const value = signOAuthState(
      { state: "abc123", codeVerifier: "verifier-value", guestUserId },
      secret
    );

    const verified = verifyOAuthState(value, secret);
    expect(verified?.guestUserId).toBe(guestUserId);
  });

  it("rejects a tampered payload", () => {
    const value = signOAuthState(
      { state: "abc123", codeVerifier: "verifier-value" },
      secret
    );
    const [payload] = value.split(".");
    const forged = `${payload}.tampered-signature`;

    expect(verifyOAuthState(forged, secret)).toBeNull();
  });

  it("rejects a payload signed with a different secret", () => {
    const value = signOAuthState(
      { state: "abc123", codeVerifier: "verifier-value" },
      secret
    );

    expect(
      verifyOAuthState(value, "different-oauth-secret-also-long-enough")
    ).toBeNull();
  });

  it("rejects an expired payload", () => {
    const value = signOAuthState(
      { state: "abc123", codeVerifier: "verifier-value" },
      secret,
      -1
    );

    expect(verifyOAuthState(value, secret)).toBeNull();
  });

  it("rejects malformed values", () => {
    expect(verifyOAuthState("not-a-token", secret)).toBeNull();
    expect(verifyOAuthState("payload.only", secret)).toBeNull();
    expect(verifyOAuthState("", secret)).toBeNull();
  });
});
