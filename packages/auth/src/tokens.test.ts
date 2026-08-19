import { describe, it, expect } from "vitest";
import { signAccessToken, verifyAccessToken } from "./tokens.js";

describe("Token Service", () => {
  const secret = "test-jwt-secret-that-is-long-enough-32-chars";

  it("signs and verifies an access token", async () => {
    const payload = {
      userId: "123e4567-e89b-12d3-a456-426614174000",
      role: "guest" as const,
    };

    const token = await signAccessToken(payload, {
      secret,
      expiresIn: "15m",
    });

    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    const verified = await verifyAccessToken(token, { secret });
    expect(verified.userId).toBe(payload.userId);
    expect(verified.role).toBe(payload.role);
  });

  it("rejects an invalid token", async () => {
    await expect(
      verifyAccessToken("invalid.jwt.token", { secret })
    ).rejects.toThrow();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signAccessToken(
      { userId: "123e4567-e89b-12d3-a456-426614174000", role: "guest" },
      { secret, expiresIn: "15m" }
    );

    await expect(
      verifyAccessToken(token, { secret: "different-secret-that-is-at-least-32-chars-long" })
    ).rejects.toThrow();
  });
});
