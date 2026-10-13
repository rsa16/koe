import { describe, it, expect, afterEach } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb, Database } from "@koe/db";
import { parseTrustProxy } from "../src/trust-proxy.js";
import { RateLimitConfig } from "../src/plugins/rate-limit.js";
import { FastifyInstance } from "fastify";

const jwtSecret = "test-jwt-secret-at-least-32-chars-long";

const generous: RateLimitConfig = {
  windowMs: 60_000,
  comments: 100,
  votes: 100,
  reactions: 100,
  duplicateCommentWindowMs: 30_000,
};

describe("parseTrustProxy", () => {
  it("treats an unset or empty value as trusting nothing", () => {
    expect(parseTrustProxy(undefined)).toBe(false);
    expect(parseTrustProxy("")).toBe(false);
    expect(parseTrustProxy("   ")).toBe(false);
    expect(parseTrustProxy("false")).toBe(false);
  });

  it("rejects trusting every proxy without an explicit acknowledgement", () => {
    expect(() => parseTrustProxy("true")).toThrow();
    expect(() => parseTrustProxy("*")).toThrow();
    expect(() => parseTrustProxy("0.0.0.0/0")).toThrow();
    expect(() => parseTrustProxy("::/0")).toThrow();
    expect(parseTrustProxy("true", { allowUnbounded: true })).toBe(true);
    expect(parseTrustProxy("*", { allowUnbounded: true })).toBe(true);
    expect(parseTrustProxy("0.0.0.0/0", { allowUnbounded: true })).toBe(true);
  });

  it("rejects a bare hop count as unable to validate the immediate peer", () => {
    expect(() => parseTrustProxy("1")).toThrow();
    expect(() => parseTrustProxy("2")).toThrow();
  });

  it("parses a bounded proxy list into trimmed entries", () => {
    expect(parseTrustProxy("127.0.0.1")).toBe("127.0.0.1");
    expect(parseTrustProxy("127.0.0.1, 10.0.0.0/8")).toEqual([
      "127.0.0.1",
      "10.0.0.0/8",
    ]);
  });
});

describe("Trust proxy (API seam)", () => {
  let apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps = [];
  });

  async function setup(
    trustProxy: ReturnType<typeof parseTrustProxy>,
    overrides: Partial<RateLimitConfig> = {}
  ): Promise<{ app: FastifyInstance; db: Database }> {
    const { db } = await createMemDb();
    const app = buildApp({
      db,
      jwtSecret,
      logger: false,
      trustProxy,
      rateLimits: { ...generous, ...overrides },
    });
    await app.ready();
    apps.push(app);
    return { app, db };
  }

  async function createThread(app: FastifyInstance): Promise<string> {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/threads/by-ref/trust-proxy-thread",
    });
    expect(response.statusCode).toBe(200);
    return response.json().id;
  }

  async function anonToken(app: FastifyInstance): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/anonymous",
    });
    expect(response.statusCode).toBe(200);
    return response.json().accessToken;
  }

  function postComment(
    app: FastifyInstance,
    threadId: string,
    token: string,
    forwardedFor: string,
    bodyMd: string
  ) {
    return app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/comments`,
      headers: {
        authorization: `Bearer ${token}`,
        "x-forwarded-for": forwardedFor,
      },
      payload: { bodyMd },
    });
  }

  it("ignores X-Forwarded-For by default, keying guests by the socket peer", async () => {
    const { app } = await setup(undefined, { comments: 1 });
    const threadId = await createThread(app);
    const first = await anonToken(app);
    const second = await anonToken(app);

    expect(
      (await postComment(app, threadId, first, "1.1.1.1", "first")).statusCode
    ).toBe(201);
    expect(
      (await postComment(app, threadId, second, "2.2.2.2", "second")).statusCode
    ).toBe(429);
  });

  it("honours X-Forwarded-For when the socket peer is a trusted proxy", async () => {
    const { app } = await setup(parseTrustProxy("127.0.0.1"), { comments: 1 });
    const threadId = await createThread(app);
    const first = await anonToken(app);
    const second = await anonToken(app);

    expect(
      (await postComment(app, threadId, first, "1.1.1.1", "first")).statusCode
    ).toBe(201);
    expect(
      (await postComment(app, threadId, second, "2.2.2.2", "second")).statusCode
    ).toBe(201);
  });
});
