import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb, Database, users } from "@koe/db";
import { eq } from "drizzle-orm";
import { signAccessToken } from "@koe/auth";
import { UserRole, UserSchema } from "@koe/core";
import { FastifyInstance } from "fastify";

describe("Ban & Suspend API Seam Integration Tests", () => {
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

  async function createThread(ref = "ban-suspend-post"): Promise<string> {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/threads/by-ref/${encodeURIComponent(ref)}`,
    });
    expect(response.statusCode).toBe(200);
    return response.json().id;
  }

  async function anonUser(): Promise<{ id: string; token: string }> {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/anonymous",
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    return { id: body.user.id, token: body.accessToken };
  }

  async function roleUser(
    role: UserRole
  ): Promise<{ id: string; token: string }> {
    const { id } = await anonUser();
    await memDb.update(users).set({ role }).where(eq(users.id, id));
    const token = await signAccessToken(
      { userId: id, role },
      { secret: jwtSecret, expiresIn: "15m" }
    );
    return { id, token };
  }

  async function postComment(
    threadId: string,
    token: string,
    bodyMd = "hello"
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

  async function approve(commentId: string, actorToken: string): Promise<void> {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/moderation/actions",
      headers: { authorization: `Bearer ${actorToken}` },
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

  function userAction(targetUserId: string, action: unknown, token: string) {
    return app.inject({
      method: "POST",
      url: "/api/v1/moderation/actions",
      headers: { authorization: `Bearer ${token}` },
      payload: { userId: targetUserId, action },
    });
  }

  async function suspendUser(
    targetUserId: string,
    actorToken: string
  ): Promise<void> {
    const response = await userAction(targetUserId, "suspend", actorToken);
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("suspended");
  }

  async function banUser(
    targetUserId: string,
    actorToken: string
  ): Promise<void> {
    const response = await userAction(targetUserId, "ban", actorToken);
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("banned");
  }

  describe("POST /api/v1/moderation/actions user targets", () => {
    it("lets a moderator suspend a user and returns the updated user", async () => {
      const moderator = await roleUser("moderator");
      const target = await anonUser();

      const response = await userAction(target.id, "suspend", moderator.token);

      expect(response.statusCode).toBe(200);
      expect(response.json().id).toBe(target.id);
      expect(response.json().status).toBe("suspended");
      expect(UserSchema.safeParse(response.json()).success).toBe(true);
    });

    it("lets an admin ban a user", async () => {
      const admin = await roleUser("admin");
      const target = await anonUser();

      const response = await userAction(target.id, "ban", admin.token);

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("banned");
    });

    it("forbids a moderator from banning a user", async () => {
      const moderator = await roleUser("moderator");
      const target = await anonUser();

      const response = await userAction(target.id, "ban", moderator.token);

      expect(response.statusCode).toBe(403);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
      expect(response.json().title).toBe("Forbidden");
    });

    it("forbids guest and member roles", async () => {
      const target = await anonUser();

      for (const role of ["guest", "member"] as const) {
        const actor = await roleUser(role);
        const response = await userAction(target.id, "suspend", actor.token);
        expect(response.statusCode).toBe(403);
        expect(response.headers["content-type"]).toContain(
          "application/problem+json"
        );
      }
    });

    it("returns 404 for an unknown user", async () => {
      const admin = await roleUser("admin");

      const response = await userAction(
        "123e4567-e89b-12d3-a456-426614174000",
        "ban",
        admin.token
      );

      expect(response.statusCode).toBe(404);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("rejects an action that does not apply to users", async () => {
      const admin = await roleUser("admin");
      const target = await anonUser();

      const response = await userAction(target.id, "approve", admin.token);

      expect(response.statusCode).toBe(400);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("records ban and suspend in the moderation audit log", async () => {
      const admin = await roleUser("admin");
      const suspended = await anonUser();
      const banned = await anonUser();

      await suspendUser(suspended.id, admin.token);
      await banUser(banned.id, admin.token);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/actions",
        headers: { authorization: `Bearer ${admin.token}` },
      });
      expect(response.statusCode).toBe(200);
      const entries = response
        .json()
        .actions.filter(
          (entry: { targetId: string }) =>
            entry.targetId === suspended.id || entry.targetId === banned.id
        );

      expect(entries).toHaveLength(2);
      for (const entry of entries) {
        expect(entry.targetType).toBe("user");
        expect(entry.actorId).toBe(admin.id);
      }
      const byTarget = new Map<string, { action: string; metadata: unknown }>(
        entries.map((entry: { targetId: string; action: string; metadata: unknown }) => [
          entry.targetId,
          entry,
        ])
      );
      expect(byTarget.get(suspended.id)?.action).toBe("suspend");
      expect(byTarget.get(banned.id)?.action).toBe("ban");
    });
  });

  describe("status enforcement on interactions", () => {
    it("blocks a suspended user from creating a comment", async () => {
      const moderator = await roleUser("moderator");
      const user = await anonUser();
      await suspendUser(user.id, moderator.token);
      const threadId = await createThread();

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/threads/${threadId}/comments`,
        headers: { authorization: `Bearer ${user.token}` },
        payload: { bodyMd: "suspended" },
      });

      expect(response.statusCode).toBe(403);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("blocks a banned user from creating a comment", async () => {
      const admin = await roleUser("admin");
      const user = await anonUser();
      await banUser(user.id, admin.token);
      const threadId = await createThread();

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/threads/${threadId}/comments`,
        headers: { authorization: `Bearer ${user.token}` },
        payload: { bodyMd: "banned" },
      });

      expect(response.statusCode).toBe(403);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("blocks a suspended user from voting", async () => {
      const moderator = await roleUser("moderator");
      const author = await anonUser();
      const user = await anonUser();
      const threadId = await createThread();
      const commentId = await postComment(threadId, author.token);
      await approve(commentId, moderator.token);
      await suspendUser(user.id, moderator.token);

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/comments/${commentId}/vote`,
        headers: { authorization: `Bearer ${user.token}` },
        payload: { value: 1 },
      });

      expect(response.statusCode).toBe(403);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("blocks a banned user from reacting", async () => {
      const admin = await roleUser("admin");
      const user = await anonUser();
      const threadId = await createThread();
      await banUser(user.id, admin.token);

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/threads/${threadId}/reactions`,
        headers: { authorization: `Bearer ${user.token}` },
        payload: { emoji: "👍" },
      });

      expect(response.statusCode).toBe(403);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("still allows suspended and banned users to read comments", async () => {
      const moderator = await roleUser("moderator");
      const author = await anonUser();
      const suspended = await anonUser();
      const threadId = await createThread();
      const commentId = await postComment(threadId, author.token);
      await approve(commentId, moderator.token);
      await suspendUser(suspended.id, moderator.token);

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/threads/${threadId}/comments`,
        headers: { authorization: `Bearer ${suspended.token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().total).toBe(1);
    });
  });

  describe("comment visibility by author status", () => {
    it("keeps a suspended author's comments visible", async () => {
      const moderator = await roleUser("moderator");
      const author = await anonUser();
      const threadId = await createThread();
      const commentId = await postComment(threadId, author.token);
      await approve(commentId, moderator.token);

      await suspendUser(author.id, moderator.token);

      const list = await listComments(threadId);
      expect(list.total).toBe(1);
      expect(list.comments[0].id).toBe(commentId);
    });

    it("hides a banned author's comments from readers without deleting them", async () => {
      const admin = await roleUser("admin");
      const author = await anonUser();
      const threadId = await createThread("banned-author-post");
      const commentId = await postComment(threadId, author.token);
      await approve(commentId, admin.token);

      const before = await listComments(threadId);
      expect(before.total).toBe(1);

      await banUser(author.id, admin.token);

      const after = await listComments(threadId);
      expect(after.total).toBe(0);
      expect(after.comments).toHaveLength(0);

      // The row is retained: the denormalized thread comment count still
      // accounts for it even though it is filtered from the public listing.
      const threadResponse = await app.inject({
        method: "GET",
        url: "/api/v1/threads/by-ref/banned-author-post",
      });
      expect(threadResponse.statusCode).toBe(200);
      expect(threadResponse.json().commentCount).toBe(1);
    });
  });
});
