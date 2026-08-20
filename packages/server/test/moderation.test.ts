import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb } from "@koe/db";
import { ModerationQueueResponseSchema } from "@koe/core";
import { FastifyInstance } from "fastify";

describe("Moderation API Seam Integration Tests", () => {
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

    it("rejects a malformed body", async () => {
      const token = await anonToken();

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
      const token = await anonToken();

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

    it("approve publishes a pending comment for everyone to see", async () => {
      const threadId = await createThread();
      const token = await anonToken();
      const commentId = await postComment(threadId, token, "approve me");

      const response = await act(commentId, "approve", token);

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
      const token = await anonToken();
      const commentId = await postComment(threadId, token, "reject me");

      const response = await act(commentId, "reject", token);

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
      const token = await anonToken();
      const commentId = await postComment(threadId, token, "delete me");

      const response = await act(commentId, "delete", token);

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
      const token = await anonToken();
      const commentId = await postComment(threadId, token, "gone");

      await act(commentId, "reject", token);

      const response = await act(commentId, "approve", token);

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
      const token = await anonToken();
      const commentId = await postComment(threadId, token, "already out");

      await act(commentId, "approve", token);
      const response = await act(commentId, "reject", token);

      expect(response.statusCode).toBe(409);
    });

    it("delete removes a published comment", async () => {
      const threadId = await createThread();
      const token = await anonToken();
      const commentId = await postComment(threadId, token, "published then gone");

      await act(commentId, "approve", token);

      const response = await act(commentId, "delete", token);

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

    it("returns pending comments with thread and author context", async () => {
      const threadId = await createThread("context-post");
      const token = await anonToken();
      const firstId = await postComment(threadId, token, "first pending");
      await postComment(threadId, token, "second pending");

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/queue",
        headers: { authorization: `Bearer ${token}` },
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
      const token = await anonToken();
      const approvedId = await postComment(threadId, token, "approved soon");
      await postComment(threadId, token, "still pending");

      await act(approvedId, "approve", token);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/queue",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.comments).toHaveLength(1);
      expect(body.comments[0].id).not.toBe(approvedId);
      expect(body.comments[0].bodyMd).toBe("still pending");
    });

    it("returns an empty list when nothing is pending", async () => {
      const threadId = await createThread();
      const token = await anonToken();
      const commentId = await postComment(threadId, token, "goes away");

      await act(commentId, "reject", token);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/queue",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().comments).toHaveLength(0);
    });
  });
});