import { describe, it, expect } from "vitest";
import { signOAuthState, verifyOAuthState } from "./oauth-state.js";

describe("OAuth State", () => {
  const secret = "test-oauth-secret-that-is-long-enough-32-chars";
  const guestUserId = "123e4567-e89b-12d3-a456-426614174000";

  it("signs and verifies an OAuth state payload", async () => {
    const value = await signOAuthState(
      { state: "abc123", codeVerifier: "verifier-value" },
      secret
    );

    expect(value.split(".").length).toBe(3);
    const verified = await verifyOAuthState(value, secret);
    expect(verified).not.toBeNull();
    expect(verified?.state).toBe("abc123");
    expect(verified?.codeVerifier).toBe("verifier-value");
    expect(verified?.guestUserId).toBeUndefined();
  });

  it("round-trips an optional guest user id", async () => {
    const value = await signOAuthState(
      { state: "abc123", codeVerifier: "verifier-value", guestUserId },
      secret
    );

    const verified = await verifyOAuthState(value, secret);
    expect(verified?.guestUserId).toBe(guestUserId);
  });

  it("rejects a tampered payload", async () => {
    const value = await signOAuthState(
      { state: "abc123", codeVerifier: "verifier-value" },
      secret
    );
    const parts = value.split(".");
    const forged = `${parts[0]}.${parts[1]}.tampered-signature`;

    expect(await verifyOAuthState(forged, secret)).toBeNull();
  });

  it("rejects a payload signed with a different secret", async () => {
    const value = await signOAuthState(
      { state: "abc123", codeVerifier: "verifier-value" },
      secret
    );

    expect(
      await verifyOAuthState(value, "different-oauth-secret-also-long-enough")
    ).toBeNull();
  });

  it("rejects an expired payload", async () => {
    const value = await signOAuthState(
      { state: "abc123", codeVerifier: "verifier-value" },
      secret,
      -1
    );

    expect(await verifyOAuthState(value, secret)).toBeNull();
  });

  it("rejects malformed values", async () => {
    expect(await verifyOAuthState("not-a-token", secret)).toBeNull();
    expect(await verifyOAuthState("payload.only", secret)).toBeNull();
    expect(await verifyOAuthState("", secret)).toBeNull();
  });
});
