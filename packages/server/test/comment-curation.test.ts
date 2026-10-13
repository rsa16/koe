import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb, Database, users } from "@koe/db";
import { eq } from "drizzle-orm";
import { signAccessToken } from "@koe/auth";
import { CommentSchema, UserRole } from "@koe/core";
import { FastifyInstance } from "fastify";

describe("Comment Curation API Seam Integration Tests", () => {
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

  async function createThread(ref = "curation"): Promise<string> {
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
    return signAccessToken(
      { userId, role },
      { secret: jwtSecret, expiresIn: "15m" }
    );
  }

  async function postComment(
    threadId: string,
    token: string,
    bodyMd: string,
    parentId?: string
  ): Promise<Record<string, unknown>> {
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: { bodyMd, ...(parentId ? { parentId } : {}) },
    });
    expect(response.statusCode).toBe(201);
    return response.json();
  }

  async function approveComment(commentId: string, token?: string) {
    const modToken = token ?? (await userToken("moderator"));
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/moderation/actions",
      headers: { authorization: `Bearer ${modToken}` },
      payload: { commentId, action: "approve" },
    });
    expect(response.statusCode).toBe(200);
  }

  async function listComments(threadId: string, token?: string) {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/threads/${threadId}/comments`,
      ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
    });
    expect(response.statusCode).toBe(200);
    return response.json();
  }

  function pinRequest(commentId: string, token: string) {
    return app.inject({
      method: "POST",
      url: `/api/v1/comments/${commentId}/pin`,
      headers: { authorization: `Bearer ${token}` },
    });
  }

  function unpinRequest(commentId: string, token: string) {
    return app.inject({
      method: "DELETE",
      url: `/api/v1/comments/${commentId}/pin`,
      headers: { authorization: `Bearer ${token}` },
    });
  }

  function deleteRequest(commentId: string, token: string) {
    return app.inject({
      method: "DELETE",
      url: `/api/v1/comments/${commentId}`,
      headers: { authorization: `Bearer ${token}` },
    });
  }

  describe("author roles in the comment list", () => {
    it("exposes each comment author's role", async () => {
      const threadId = await createThread("role-list");
      const adminToken = await userToken("admin");
      const moderatorToken = await userToken("moderator");

      const adminComment = await postComment(threadId, adminToken, "from admin");
      const modComment = await postComment(
        threadId,
        moderatorToken,
        "from moderator"
      );
      await approveComment(adminComment.id as string, adminToken);
      await approveComment(modComment.id as string, adminToken);

      const list = await listComments(threadId, adminToken);
      const byBody = new Map(
        list.comments.map((c: { bodyMd: string }) => [c.bodyMd, c])
      );
      expect(byBody.get("from admin")?.authorRole).toBe("admin");
      expect(byBody.get("from moderator")?.authorRole).toBe("moderator");
    });

    it("defaults a guest author's role to guest", async () => {
      const threadId = await createThread("role-guest");
      const token = await anonToken();
      const comment = await postComment(threadId, token, "from guest");
      await approveComment(comment.id as string);

      const list = await listComments(threadId);
      expect(list.comments[0].authorRole).toBe("guest");
    });
  });

  describe("POST/DELETE /api/v1/comments/:id/pin", () => {
    it("requires authentication", async () => {
      const threadId = await createThread("pin-auth");
      const token = await anonToken();
      const comment = await postComment(threadId, token, "pin me");

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/comments/${comment.id}/pin`,
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("forbids guests and members", async () => {
      const threadId = await createThread("pin-forbidden");
      const memberToken = await userToken("member");
      const comment = await postComment(threadId, memberToken, "pin me");

      const response = await pinRequest(comment.id as string, memberToken);

      expect(response.statusCode).toBe(403);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("allows a moderator to pin and unpin a comment", async () => {
      const threadId = await createThread("pin-roundtrip");
      const authorToken = await anonToken();
      const moderatorToken = await userToken("moderator");
      const comment = await postComment(threadId, authorToken, "pin me");

      const pinned = await pinRequest(comment.id as string, moderatorToken);
      expect(pinned.statusCode).toBe(200);
      expect(pinned.json().pinnedAt).not.toBeNull();
      expect(CommentSchema.safeParse(pinned.json()).success).toBe(true);

      const unpinned = await unpinRequest(comment.id as string, moderatorToken);
      expect(unpinned.statusCode).toBe(200);
      expect(unpinned.json().pinnedAt).toBeNull();
    });

    it("returns 404 for an unknown comment", async () => {
      const moderatorToken = await userToken("moderator");

      const response = await pinRequest(
        "123e4567-e89b-12d3-a456-426614174000",
        moderatorToken
      );

      expect(response.statusCode).toBe(404);
    });

    it("orders pinned comments ahead of newer unpinned comments", async () => {
      const threadId = await createThread("pin-order");
      const authorToken = await anonToken();
      const moderatorToken = await userToken("moderator");

      const older = await postComment(threadId, authorToken, "older");
      const newer = await postComment(threadId, authorToken, "newer");
      await approveComment(older.id as string);
      await approveComment(newer.id as string);

      const before = await listComments(threadId);
      expect(before.comments.map((c: { bodyMd: string }) => c.bodyMd)).toEqual([
        "older",
        "newer",
      ]);

      await pinRequest(newer.id as string, moderatorToken);

      const after = await listComments(threadId);
      expect(after.comments.map((c: { bodyMd: string }) => c.bodyMd)).toEqual([
        "newer",
        "older",
      ]);
      expect(after.comments[0].pinnedAt).not.toBeNull();
      expect(after.comments[1].pinnedAt).toBeNull();
    });

    it("orders a pinned reply ahead of its unpinned siblings", async () => {
      const threadId = await createThread("pin-reply-order");
      const authorToken = await anonToken();
      const moderatorToken = await userToken("moderator");

      const root = await postComment(threadId, authorToken, "root");
      const firstReply = await postComment(
        threadId,
        authorToken,
        "first reply",
        root.id as string
      );
      const secondReply = await postComment(
        threadId,
        authorToken,
        "second reply",
        root.id as string
      );
      for (const comment of [root, firstReply, secondReply]) {
        await approveComment(comment.id as string);
      }

      await pinRequest(secondReply.id as string, moderatorToken);

      const list = await listComments(threadId);
      expect(
        list.comments[0].children.map((c: { bodyMd: string }) => c.bodyMd)
      ).toEqual(["second reply", "first reply"]);
    });
  });

  describe("DELETE /api/v1/comments/:id", () => {
    it("requires authentication", async () => {
      const threadId = await createThread("delete-auth");
      const token = await anonToken();
      const comment = await postComment(threadId, token, "delete me");

      const response = await app.inject({
        method: "DELETE",
        url: `/api/v1/comments/${comment.id}`,
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns 404 for an unknown comment", async () => {
      const token = await anonToken();

      const response = await deleteRequest(
        "123e4567-e89b-12d3-a456-426614174000",
        token
      );

      expect(response.statusCode).toBe(404);
    });

    it("forbids deleting someone else's comment", async () => {
      const threadId = await createThread("delete-forbidden");
      const authorToken = await anonToken();
      const otherToken = await anonToken();
      const comment = await postComment(threadId, authorToken, "not yours");
      await approveComment(comment.id as string);

      const response = await deleteRequest(comment.id as string, otherToken);

      expect(response.statusCode).toBe(403);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("soft-deletes the author's own leaf comment and hides it", async () => {
      const threadId = await createThread("delete-leaf");
      const authorToken = await anonToken();
      const comment = await postComment(threadId, authorToken, "remove me");
      await approveComment(comment.id as string);

      const response = await deleteRequest(comment.id as string, authorToken);
      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("deleted");

      const list = await listComments(threadId);
      expect(list.total).toBe(0);
      expect(list.comments).toHaveLength(0);
    });

    it("keeps a tombstone so replies survive when a comment with replies is deleted", async () => {
      const threadId = await createThread("delete-with-replies");
      const authorToken = await anonToken();
      const root = await postComment(threadId, authorToken, "root");
      const reply = await postComment(
        threadId,
        authorToken,
        "reply",
        root.id as string
      );
      await approveComment(root.id as string);
      await approveComment(reply.id as string);

      const response = await deleteRequest(root.id as string, authorToken);
      expect(response.statusCode).toBe(200);

      const list = await listComments(threadId);
      expect(list.total).toBe(1);
      const tombstone = list.comments[0];
      expect(tombstone.id).toBe(root.id);
      expect(tombstone.status).toBe("deleted");
      expect(tombstone.bodyMd).toBe("");
      expect(tombstone.children).toHaveLength(1);
      expect(tombstone.children[0].bodyMd).toBe("reply");
    });
  });
});
