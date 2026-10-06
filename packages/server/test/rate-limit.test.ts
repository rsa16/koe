import { describe, it, expect, afterEach, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb, Database, users } from "@koe/db";
import { RateLimitConfig } from "../src/plugins/rate-limit.js";
import { signAccessToken } from "@koe/auth";
import { eq } from "drizzle-orm";
import { FastifyInstance } from "fastify";

vi.setConfig({ testTimeout: 30_000 });

const jwtSecret = "test-jwt-secret-at-least-32-chars-long";

const generous: RateLimitConfig = {
  windowMs: 60_000,
  comments: 100,
  votes: 100,
  reactions: 100,
  duplicateCommentWindowMs: 30_000,
};

describe("Rate limiting & duplicate guard (API seam)", () => {
  let apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps = [];
  });

  async function setup(
    overrides: Partial<RateLimitConfig> = {}
  ): Promise<{ app: FastifyInstance; db: Database }> {
    const { db } = await createMemDb();
    const app = buildApp({
      db,
      jwtSecret,
      logger: false,
      rateLimits: { ...generous, ...overrides },
    });
    await app.ready();
    apps.push(app);
    return { app, db };
  }

  async function createThread(
    app: FastifyInstance,
    ref = "rate-limit-thread"
  ): Promise<string> {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/threads/by-ref/${encodeURIComponent(ref)}`,
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

  async function memberToken(
    app: FastifyInstance,
    db: Database
  ): Promise<string> {
    const guestToken = await anonToken(app);
    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${guestToken}` },
    });
    expect(meRes.statusCode).toBe(200);
    const userId = meRes.json().id as string;
    await db.update(users).set({ role: "member" }).where(eq(users.id, userId));
    return signAccessToken(
      { userId, role: "member" },
      { secret: jwtSecret, expiresIn: "15m" }
    );
  }

  function postComment(
    app: FastifyInstance,
    threadId: string,
    token: string,
    bodyMd: string
  ) {
    return app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: { bodyMd },
    });
  }

  it("returns 429 with Problem Details once a caller exceeds the comment limit", async () => {
    const { app } = await setup({ comments: 2 });
    const threadId = await createThread(app);
    const token = await anonToken(app);

    expect((await postComment(app, threadId, token, "one")).statusCode).toBe(201);
    expect((await postComment(app, threadId, token, "two")).statusCode).toBe(201);

    const limited = await postComment(app, threadId, token, "three");

    expect(limited.statusCode).toBe(429);
    expect(limited.headers["content-type"]).toContain(
      "application/problem+json"
    );
    const problem = limited.json();
    expect(problem.status).toBe(429);
    expect(problem.title).toBe("Too Many Requests");
    expect(problem.instance).toBe(`/api/v1/threads/${threadId}/comments`);
  });

  it("keys guests by IP so fresh anonymous identities share a bucket", async () => {
    const { app } = await setup({ comments: 1 });
    const threadId = await createThread(app);
    const first = await anonToken(app);
    const second = await anonToken(app);

    expect((await postComment(app, threadId, first, "first")).statusCode).toBe(201);
    expect((await postComment(app, threadId, second, "second")).statusCode).toBe(
      429
    );
  });

  it("keys authenticated members by their User id", async () => {
    const { app, db } = await setup({ comments: 1 });
    const threadId = await createThread(app);
    const first = await memberToken(app, db);
    const second = await memberToken(app, db);

    expect((await postComment(app, threadId, first, "first")).statusCode).toBe(201);
    expect((await postComment(app, threadId, first, "second")).statusCode).toBe(
      429
    );
    expect((await postComment(app, threadId, second, "third")).statusCode).toBe(
      201
    );
  });

  it("rejects an identical comment body from the same author within the window", async () => {
    const { app } = await setup();
    const threadId = await createThread(app);
    const token = await anonToken(app);

    expect(
      (await postComment(app, threadId, token, "same body")).statusCode
    ).toBe(201);

    const duplicate = await postComment(app, threadId, token, "same body");

    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.headers["content-type"]).toContain(
      "application/problem+json"
    );
    expect(duplicate.json().detail).toBe("Duplicate comment detected");
  });

  it("allows a different body from the same author within the window", async () => {
    const { app } = await setup();
    const threadId = await createThread(app);
    const token = await anonToken(app);

    expect((await postComment(app, threadId, token, "first")).statusCode).toBe(201);
    expect((await postComment(app, threadId, token, "second")).statusCode).toBe(201);
  });

  it("allows the same body from a different author", async () => {
    const { app } = await setup();
    const threadId = await createThread(app);
    const first = await anonToken(app);
    const second = await anonToken(app);

    expect(
      (await postComment(app, threadId, first, "shared body")).statusCode
    ).toBe(201);
    expect(
      (await postComment(app, threadId, second, "shared body")).statusCode
    ).toBe(201);
  });

  it("does not treat the same body in a different thread as a duplicate", async () => {
    const { app } = await setup();
    const firstThread = await createThread(app, "thread-a");
    const secondThread = await createThread(app, "thread-b");
    const token = await anonToken(app);

    expect(
      (await postComment(app, firstThread, token, "cross-posted")).statusCode
    ).toBe(201);
    expect(
      (await postComment(app, secondThread, token, "cross-posted")).statusCode
    ).toBe(201);
  });

  it("allows the same body once the duplicate window has elapsed", async () => {
    const { app } = await setup({ duplicateCommentWindowMs: 50 });
    const threadId = await createThread(app);
    const token = await anonToken(app);

    expect(
      (await postComment(app, threadId, token, "repeat me")).statusCode
    ).toBe(201);

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(
      (await postComment(app, threadId, token, "repeat me")).statusCode
    ).toBe(201);
  });

  it("rate limits votes", async () => {
    const { app } = await setup({ votes: 2 });
    const threadId = await createThread(app);
    const token = await anonToken(app);
    const comment = await postComment(app, threadId, token, "votable");
    expect(comment.statusCode).toBe(201);
    const commentId = comment.json().id;

    const vote = () =>
      app.inject({
        method: "POST",
        url: `/api/v1/comments/${commentId}/vote`,
        headers: { authorization: `Bearer ${token}` },
        payload: { value: 1 },
      });

    expect((await vote()).statusCode).toBe(201);
    expect((await vote()).statusCode).toBe(204);
    expect((await vote()).statusCode).toBe(429);
  });

  it("rate limits reactions", async () => {
    const { app } = await setup({ reactions: 2 });
    const threadId = await createThread(app);
    const token = await anonToken(app);

    const react = () =>
      app.inject({
        method: "POST",
        url: `/api/v1/threads/${threadId}/reactions`,
        headers: { authorization: `Bearer ${token}` },
        payload: { emoji: "👍" },
      });

    expect((await react()).statusCode).toBe(201);
    expect((await react()).statusCode).toBe(204);
    expect((await react()).statusCode).toBe(429);
  });
});
