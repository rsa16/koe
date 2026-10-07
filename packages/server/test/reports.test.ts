import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb, Database, users } from "@koe/db";
import { eq } from "drizzle-orm";
import { ReportSchema, UserRole } from "@koe/core";
import { FastifyInstance } from "fastify";
import { signAccessToken } from "@koe/auth";

describe("Reports API Seam Integration Tests", () => {
  let app: FastifyInstance;
  let memDb: Database;
  const jwtSecret = "test-jwt-secret-at-least-32-chars-long";

  beforeEach(async () => {
    const { db } = await createMemDb();
    memDb = db;
    app = buildApp({
      db,
      jwtSecret,
      logger: false,
      preModerationDefault: true,
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  async function createThread(ref = "reports-post"): Promise<string> {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/threads/by-ref/${encodeURIComponent(ref)}`,
    });
    expect(response.statusCode).toBe(200);
    return response.json().id;
  }

  async function anonToken(): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/anonymous",
    });
    expect(response.statusCode).toBe(200);
    return response.json().accessToken;
  }

  async function userToken(
    role: UserRole = "moderator"
  ): Promise<{ token: string; userId: string }> {
    const guestToken = await anonToken();
    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${guestToken}` },
    });
    expect(meRes.statusCode).toBe(200);
    const userId = meRes.json().id;

    await memDb.update(users).set({ role }).where(eq(users.id, userId));
    return {
      userId,
      token: await signAccessToken(
        { userId, role },
        { secret: jwtSecret, expiresIn: "15m" }
      ),
    };
  }

  async function postComment(
    threadId: string,
    token: string,
    bodyMd: string
  ): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: { bodyMd },
    });
    expect(response.statusCode).toBe(201);
    return response.json().id;
  }

  function report(commentId: string, reason: unknown, token?: string) {
    return app.inject({
      method: "POST",
      url: `/api/v1/comments/${commentId}/reports`,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
      payload: { reason },
    });
  }

  async function moderate(
    commentId: string,
    action: "approve" | "reject" | "delete",
    token: string
  ) {
    return app.inject({
      method: "POST",
      url: "/api/v1/moderation/actions",
      headers: { authorization: `Bearer ${token}` },
      payload: { commentId, action },
    });
  }

  async function approve(commentId: string, token: string) {
    const response = await moderate(commentId, "approve", token);
    expect(response.statusCode).toBe(200);
  }

  async function queueIds(token: string): Promise<string[]> {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/moderation/queue",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    return response.json().comments.map((c: { id: string }) => c.id);
  }

  it("requires authentication", async () => {
    const response = await report(
      "123e4567-e89b-12d3-a456-426614174000",
      "abusive"
    );

    expect(response.statusCode).toBe(401);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json"
    );
  });

  it("returns 404 for an unknown comment", async () => {
    const token = await anonToken();

    const response = await report(
      "123e4567-e89b-12d3-a456-426614174000",
      "abusive",
      token
    );

    expect(response.statusCode).toBe(404);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json"
    );
  });

  it("rejects a missing or empty reason", async () => {
    const token = await anonToken();
    const threadId = await createThread();
    const commentId = await postComment(threadId, token, "report target");

    const missing = await app.inject({
      method: "POST",
      url: `/api/v1/comments/${commentId}/reports`,
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(missing.statusCode).toBe(400);
    expect(missing.headers["content-type"]).toContain(
      "application/problem+json"
    );

    const empty = await report(commentId, "   ", token);
    expect(empty.statusCode).toBe(400);
  });

  it("creates an open report against a comment", async () => {
    const authorToken = await anonToken();
    const reporter = await userToken("member");
    const threadId = await createThread();
    const commentId = await postComment(threadId, authorToken, "report me");

    const response = await report(commentId, "  spam links  ", reporter.token);

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.commentId).toBe(commentId);
    expect(body.reporterId).toBe(reporter.userId);
    expect(body.reason).toBe("spam links");
    expect(body.status).toBe("open");
    expect(body.id).toBeDefined();

    const parsed = ReportSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  it("surfaces a published comment with an open report in the moderation queue", async () => {
    const authorToken = await anonToken();
    const reporterToken = await anonToken();
    const moderator = await userToken("moderator");
    const threadId = await createThread("reported-published-post");
    const commentId = await postComment(threadId, authorToken, "published and reported");

    await approve(commentId, moderator.token);
    await report(commentId, "harassment", reporterToken);

    const queue = await app.inject({
      method: "GET",
      url: "/api/v1/moderation/queue",
      headers: { authorization: `Bearer ${moderator.token}` },
    });

    expect(queue.statusCode).toBe(200);
    const ids = queue.json().comments.map((c: { id: string }) => c.id);
    expect(ids).toContain(commentId);
  });

  it("does not surface an unreported published comment in the moderation queue", async () => {
    const authorToken = await anonToken();
    const moderator = await userToken("moderator");
    const threadId = await createThread("unreported-published-post");
    const commentId = await postComment(threadId, authorToken, "published and fine");

    await approve(commentId, moderator.token);

    const queue = await app.inject({
      method: "GET",
      url: "/api/v1/moderation/queue",
      headers: { authorization: `Bearer ${moderator.token}` },
    });

    expect(queue.statusCode).toBe(200);
    const ids = queue.json().comments.map((c: { id: string }) => c.id);
    expect(ids).not.toContain(commentId);
  });

  it("dismisses open reports when a reported published comment is approved", async () => {
    const authorToken = await anonToken();
    const reporterToken = await anonToken();
    const moderator = await userToken("moderator");
    const threadId = await createThread("reported-dismiss-post");
    const commentId = await postComment(threadId, authorToken, "reported then kept");

    await approve(commentId, moderator.token);
    await report(commentId, "harassment", reporterToken);
    expect(await queueIds(moderator.token)).toContain(commentId);

    const cleared = await moderate(commentId, "approve", moderator.token);

    expect(cleared.statusCode).toBe(200);
    expect(cleared.json().status).toBe("published");
    expect(await queueIds(moderator.token)).not.toContain(commentId);
  });

  it("removes a reported published comment from the queue when it is deleted", async () => {
    const authorToken = await anonToken();
    const reporterToken = await anonToken();
    const moderator = await userToken("moderator");
    const threadId = await createThread("reported-delete-post");
    const commentId = await postComment(threadId, authorToken, "reported then removed");

    await approve(commentId, moderator.token);
    await report(commentId, "abuse", reporterToken);
    expect(await queueIds(moderator.token)).toContain(commentId);

    const removed = await moderate(commentId, "delete", moderator.token);

    expect(removed.statusCode).toBe(200);
    expect(removed.json().status).toBe("deleted");
    expect(await queueIds(moderator.token)).not.toContain(commentId);
  });

  it("lets multiple users report the same comment", async () => {
    const authorToken = await anonToken();
    const firstReporter = await anonToken();
    const secondReporter = await anonToken();
    const threadId = await createThread("multi-report-post");
    const commentId = await postComment(threadId, authorToken, "twice reported");

    const first = await report(commentId, "abuse", firstReporter);
    const second = await report(commentId, "spam", secondReporter);

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(first.json().id).not.toBe(second.json().id);
  });
});
