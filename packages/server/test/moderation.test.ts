import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb, Database, users } from "@koe/db";
import { eq } from "drizzle-orm";
import {
  ModerationActionListResponseSchema,
  ModerationQueueResponseSchema,
  UserRole,
} from "@koe/core";
import { FastifyInstance } from "fastify";
import { signAccessToken } from "@koe/auth";

describe("Moderation API Seam Integration Tests", () => {
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

  async function createThread(ref = "moderation-post"): Promise<string> {
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

  async function userToken(role: UserRole = "moderator"): Promise<string> {
    const guestToken = await anonToken();
    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${guestToken}` },
    });
    expect(meRes.statusCode).toBe(200);
    const userId = meRes.json().id;

    await memDb.update(users).set({ role }).where(eq(users.id, userId));
    return signAccessToken({ userId, role }, { secret: jwtSecret, expiresIn: "15m" });
  }

  async function userIdFor(token: string): Promise<string> {
    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(meRes.statusCode).toBe(200);
    return meRes.json().id;
  }

  async function auditLog(token: string) {
    return app.inject({
      method: "GET",
      url: "/api/v1/moderation/actions",
      headers: { authorization: `Bearer ${token}` },
    });
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
    expect(response.json().status).toBe("pending");
    return response.json().id;
  }

  async function act(
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

  describe("POST /api/v1/moderation/actions", () => {
    it("requires authentication", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/moderation/actions",
        payload: {
          commentId: "123e4567-e89b-12d3-a456-426614174000",
          action: "approve",
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("returns 403 Forbidden for guest or member roles", async () => {
      const guestToken = await anonToken();
      const memberToken = await userToken("member");

      const resGuest = await app.inject({
        method: "POST",
        url: "/api/v1/moderation/actions",
        headers: { authorization: `Bearer ${guestToken}` },
        payload: {
          commentId: "123e4567-e89b-12d3-a456-426614174000",
          action: "approve",
        },
      });
      expect(resGuest.statusCode).toBe(403);
      expect(resGuest.headers["content-type"]).toContain(
        "application/problem+json"
      );
      expect(resGuest.json().title).toBe("Forbidden");

      const resMember = await app.inject({
        method: "POST",
        url: "/api/v1/moderation/actions",
        headers: { authorization: `Bearer ${memberToken}` },
        payload: {
          commentId: "123e4567-e89b-12d3-a456-426614174000",
          action: "approve",
        },
      });
      expect(resMember.statusCode).toBe(403);
      expect(resMember.headers["content-type"]).toContain(
        "application/problem+json"
      );
      expect(resMember.json().title).toBe("Forbidden");
    });

    it("rejects a malformed body", async () => {
      const token = await userToken("moderator");

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/moderation/actions",
        headers: { authorization: `Bearer ${token}` },
        payload: { commentId: "not-a-uuid", action: "nuke" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("returns 404 for an unknown comment", async () => {
      const token = await userToken("moderator");

      const response = await act(
        "123e4567-e89b-12d3-a456-426614174000",
        "approve",
        token
      );

      expect(response.statusCode).toBe(404);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("approve publishes a pending comment for everyone to see (moderator & admin)", async () => {
      const threadId = await createThread();
      const authorToken = await anonToken();
      const modToken = await userToken("moderator");
      const commentId = await postComment(threadId, authorToken, "approve me");

      const response = await act(commentId, "approve", modToken);

      expect(response.statusCode).toBe(200);
      expect(response.json().id).toBe(commentId);
      expect(response.json().status).toBe("published");

      const list = await app.inject({
        method: "GET",
        url: `/api/v1/threads/${threadId}/comments`,
      });
      expect(list.statusCode).toBe(200);
      const listBody = list.json();
      expect(listBody.total).toBe(1);
      expect(listBody.comments[0].id).toBe(commentId);
      expect(listBody.comments[0].status).toBe("published");
    });

    it("reject hides a pending comment from anonymous readers", async () => {
      const threadId = await createThread();
      const authorToken = await anonToken();
      const adminToken = await userToken("admin");
      const commentId = await postComment(threadId, authorToken, "reject me");

      const response = await act(commentId, "reject", adminToken);

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("deleted");

      const list = await app.inject({
        method: "GET",
        url: `/api/v1/threads/${threadId}/comments`,
      });
      expect(list.json().total).toBe(0);
    });

    it("delete hides a pending comment from anonymous readers", async () => {
      const threadId = await createThread();
      const authorToken = await anonToken();
      const modToken = await userToken("moderator");
      const commentId = await postComment(threadId, authorToken, "delete me");

      const response = await act(commentId, "delete", modToken);

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("deleted");

      const list = await app.inject({
        method: "GET",
        url: `/api/v1/threads/${threadId}/comments`,
      });
      expect(list.json().total).toBe(0);
    });

    it("approve cannot resurrect a deleted comment", async () => {
      const threadId = await createThread();
      const authorToken = await anonToken();
      const modToken = await userToken("moderator");
      const commentId = await postComment(threadId, authorToken, "gone");

      await act(commentId, "reject", modToken);

      const response = await act(commentId, "approve", modToken);

      expect(response.statusCode).toBe(409);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );

      const list = await app.inject({
        method: "GET",
        url: `/api/v1/threads/${threadId}/comments`,
      });
      expect(list.json().total).toBe(0);
    });

    it("reject cannot be applied to an already published comment", async () => {
      const threadId = await createThread();
      const authorToken = await anonToken();
      const modToken = await userToken("moderator");
      const commentId = await postComment(threadId, authorToken, "already out");

      await act(commentId, "approve", modToken);
      const response = await act(commentId, "reject", modToken);

      expect(response.statusCode).toBe(409);
    });

    it("delete removes a published comment", async () => {
      const threadId = await createThread();
      const authorToken = await anonToken();
      const modToken = await userToken("moderator");
      const commentId = await postComment(threadId, authorToken, "published then gone");

      await act(commentId, "approve", modToken);

      const response = await act(commentId, "delete", modToken);

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("deleted");

      const list = await app.inject({
        method: "GET",
        url: `/api/v1/threads/${threadId}/comments`,
      });
      expect(list.json().total).toBe(0);
    });
  });

  describe("GET /api/v1/moderation/queue", () => {
    it("requires authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/queue",
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("returns 403 Forbidden for guest or member roles", async () => {
      const guestToken = await anonToken();
      const memberToken = await userToken("member");

      const resGuest = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/queue",
        headers: { authorization: `Bearer ${guestToken}` },
      });
      expect(resGuest.statusCode).toBe(403);
      expect(resGuest.headers["content-type"]).toContain(
        "application/problem+json"
      );
      expect(resGuest.json().title).toBe("Forbidden");

      const resMember = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/queue",
        headers: { authorization: `Bearer ${memberToken}` },
      });
      expect(resMember.statusCode).toBe(403);
      expect(resMember.headers["content-type"]).toContain(
        "application/problem+json"
      );
      expect(resMember.json().title).toBe("Forbidden");
    });

    it("returns pending comments with thread and author context for moderator", async () => {
      const threadId = await createThread("context-post");
      const authorToken = await anonToken();
      const modToken = await userToken("moderator");
      const firstId = await postComment(threadId, authorToken, "first pending");
      await postComment(threadId, authorToken, "second pending");

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/queue",
        headers: { authorization: `Bearer ${modToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.comments).toHaveLength(2);
      const first = body.comments.find(
        (c: { id: string }) => c.id === firstId
      );
      expect(first.bodyMd).toBe("first pending");
      expect(first.status).toBe("pending");
      expect(first.thread.externalRef).toBe("context-post");
      expect(first.thread.id).toBe(threadId);
      expect(first.authorName).toBeNull();

      const parseResult = ModerationQueueResponseSchema.safeParse(body);
      expect(parseResult.success).toBe(true);
    });

    it("excludes comments that have been approved", async () => {
      const threadId = await createThread();
      const authorToken = await anonToken();
      const modToken = await userToken("moderator");
      const approvedId = await postComment(threadId, authorToken, "approved soon");
      await postComment(threadId, authorToken, "still pending");

      await act(approvedId, "approve", modToken);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/queue",
        headers: { authorization: `Bearer ${modToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.comments).toHaveLength(1);
      expect(body.comments[0].id).not.toBe(approvedId);
      expect(body.comments[0].bodyMd).toBe("still pending");
    });

    it("returns an empty list when nothing is pending", async () => {
      const threadId = await createThread();
      const authorToken = await anonToken();
      const adminToken = await userToken("admin");
      const commentId = await postComment(threadId, authorToken, "goes away");

      await act(commentId, "reject", adminToken);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/queue",
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().comments).toHaveLength(0);
    });
  });

  describe("moderation audit log", () => {
    it("writes an audit record for every moderation action", async () => {
      const threadId = await createThread("audit-post");
      const authorToken = await anonToken();
      const moderatorToken = await userToken("moderator");
      const actorId = await userIdFor(moderatorToken);

      const approvedId = await postComment(threadId, authorToken, "approve me");
      const rejectedId = await postComment(threadId, authorToken, "reject me");
      const deletedId = await postComment(threadId, authorToken, "delete me");

      await act(approvedId, "approve", moderatorToken);
      await act(rejectedId, "reject", moderatorToken);
      await act(deletedId, "delete", moderatorToken);

      const adminToken = await userToken("admin");
      const response = await auditLog(adminToken);

      expect(response.statusCode).toBe(200);
      const body = response.json();
      const parsed = ModerationActionListResponseSchema.safeParse(body);
      expect(parsed.success).toBe(true);

      const byTarget = new Map(
        body.actions.map((entry: { targetId: string }) => [
          entry.targetId,
          entry,
        ])
      );
      for (const [targetId, action] of [
        [approvedId, "approve"],
        [rejectedId, "reject"],
        [deletedId, "delete"],
      ] as const) {
        const entry = byTarget.get(targetId);
        expect(entry).toBeDefined();
        expect(entry.action).toBe(action);
        expect(entry.targetType).toBe("comment");
        expect(entry.actorId).toBe(actorId);
        expect(entry.metadata.previousStatus).toBe("pending");
      }
    });

    it("does not write an audit record for a failed action", async () => {
      const threadId = await createThread("audit-failed-post");
      const authorToken = await anonToken();
      const moderatorToken = await userToken("moderator");
      const commentId = await postComment(threadId, authorToken, "once");

      await act(commentId, "approve", moderatorToken);
      const conflict = await act(commentId, "approve", moderatorToken);
      expect(conflict.statusCode).toBe(409);

      const adminToken = await userToken("admin");
      const response = await auditLog(adminToken);
      const entries = response
        .json()
        .actions.filter(
          (entry: { targetId: string }) => entry.targetId === commentId
        );

      expect(entries).toHaveLength(1);
    });

    it("requires authentication and admin role", async () => {
      const unauthorized = await auditLog("not-a-token");
      expect(unauthorized.statusCode).toBe(401);

      const moderatorToken = await userToken("moderator");
      const forbidden = await auditLog(moderatorToken);
      expect(forbidden.statusCode).toBe(403);
      expect(forbidden.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });
  });
});
