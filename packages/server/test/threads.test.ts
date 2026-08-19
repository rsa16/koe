import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb } from "@koe/db";
import { ThreadSchema } from "@koe/core";
import { FastifyInstance } from "fastify";

describe("Server API Seam Integration Tests", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    const { db } = await createMemDb();
    app = buildApp({
      db,
      jwtSecret: "test-jwt-secret-at-least-32-chars-long",
      logger: false,
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("GET /health returns 200 OK", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("GET /api/v1/threads/by-ref/:ref creates a new thread if it does not exist", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/threads/by-ref/test-post-123?title=My%20Test%20Post&url=https://example.com/post/123",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.externalRef).toBe("test-post-123");
    expect(body.title).toBe("My Test Post");
    expect(body.url).toBe("https://example.com/post/123");
    expect(body.status).toBe("open");
    expect(body.preModeration).toBe(true);
    expect(body.commentCount).toBe(0);
    expect(body.id).toBeDefined();

    // Verify it conforms to the core Thread Zod schema
    const parseResult = ThreadSchema.safeParse({
      ...body,
      createdAt: new Date(body.createdAt),
      updatedAt: new Date(body.updatedAt),
    });
    expect(parseResult.success).toBe(true);
  });

  it("GET /api/v1/threads/by-ref/:ref returns existing thread on subsequent requests without creating duplicate", async () => {
    const firstResponse = await app.inject({
      method: "GET",
      url: "/api/v1/threads/by-ref/idempotent-ref",
    });
    expect(firstResponse.statusCode).toBe(200);
    const firstBody = firstResponse.json();

    const secondResponse = await app.inject({
      method: "GET",
      url: "/api/v1/threads/by-ref/idempotent-ref",
    });
    expect(secondResponse.statusCode).toBe(200);
    const secondBody = secondResponse.json();

    expect(secondBody.id).toBe(firstBody.id);
    expect(secondBody.externalRef).toBe("idempotent-ref");
  });
});
