import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb } from "@koe/db";
import { FastifyInstance } from "fastify";

describe("Auth API Seam Integration Tests", () => {
  let app: FastifyInstance;
  const jwtSecret = "test-jwt-secret-at-least-32-chars-long";

  beforeEach(async () => {
    const { db } = await createMemDb();
    app = buildApp({ db, jwtSecret, logger: false });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("POST /api/v1/auth/anonymous creates a guest user and returns access token", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/anonymous",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.accessToken).toBeDefined();
    expect(typeof body.accessToken).toBe("string");
    expect(body.user).toBeDefined();
    expect(body.user.role).toBe("guest");
    expect(body.user.status).toBe("active");
    expect(body.user.id).toBeDefined();
  });

  it("GET /api/v1/auth/me returns 401 Unauthorized when missing token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
    });

    expect(response.statusCode).toBe(401);
    expect(response.headers["content-type"]).toContain("application/problem+json");
    const body = response.json();
    expect(body.status).toBe(401);
    expect(body.title).toBe("Unauthorized");
  });

  it("GET /api/v1/auth/me returns 401 Unauthorized when token is invalid", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        authorization: "Bearer invalid-token",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.headers["content-type"]).toContain("application/problem+json");
  });

  it("GET /api/v1/auth/me returns user profile when valid bearer token is provided", async () => {
    const anonRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/anonymous",
    });
    const { accessToken, user } = anonRes.json();

    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(meRes.statusCode).toBe(200);
    const meBody = meRes.json();
    expect(meBody.id).toBe(user.id);
    expect(meBody.role).toBe("guest");
    expect(meBody.status).toBe("active");
  });

  it("GET /api/v1/auth/me rejects cookie-based authentication on the public API", async () => {
    const anonRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/anonymous",
    });
    const { accessToken } = anonRes.json();

    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: {
        auth_token: accessToken,
      },
    });

    expect(meRes.statusCode).toBe(401);
    expect(meRes.headers["content-type"]).toContain("application/problem+json");
  });

  describe("PATCH /api/v1/auth/me", () => {
    async function anonUser(): Promise<{ id: string; token: string }> {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/anonymous",
      });
      const body = response.json();
      return { id: body.user.id, token: body.accessToken };
    }

    it("requires authentication", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/auth/me",
        payload: { name: "Anonymous" },
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("updates the display name and avatar and returns the updated user", async () => {
      const { id, token } = await anonUser();

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/auth/me",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          name: "  Renamed Reader  ",
          avatarUrl: "https://example.com/avatar.png",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(id);
      expect(body.name).toBe("Renamed Reader");
      expect(body.avatarUrl).toBe("https://example.com/avatar.png");

      const meRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(meRes.json().name).toBe("Renamed Reader");
      expect(meRes.json().avatarUrl).toBe("https://example.com/avatar.png");
    });

    it("updates only the fields provided", async () => {
      const { token } = await anonUser();
      const headers = { authorization: `Bearer ${token}` };

      await app.inject({
        method: "PATCH",
        url: "/api/v1/auth/me",
        headers,
        payload: { name: "First", avatarUrl: "https://example.com/a.png" },
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/auth/me",
        headers,
        payload: { name: "Second" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().name).toBe("Second");
      expect(response.json().avatarUrl).toBe("https://example.com/a.png");
    });

    it("clears the avatar with an explicit null", async () => {
      const { token } = await anonUser();
      const headers = { authorization: `Bearer ${token}` };

      await app.inject({
        method: "PATCH",
        url: "/api/v1/auth/me",
        headers,
        payload: { avatarUrl: "https://example.com/a.png" },
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/auth/me",
        headers,
        payload: { avatarUrl: null },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().avatarUrl).toBeNull();
    });

    it("rejects an empty update body with a 400 Problem Details", async () => {
      const { token } = await anonUser();

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/auth/me",
        headers: { authorization: `Bearer ${token}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("rejects a non-url avatar", async () => {
      const { token } = await anonUser();

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/auth/me",
        headers: { authorization: `Bearer ${token}` },
        payload: { avatarUrl: "not-a-url" },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});