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
});