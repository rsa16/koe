import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb, Database, users } from "@koe/db";
import { eq } from "drizzle-orm";
import { signAccessToken } from "@koe/auth";
import { ReactionSchema, UserRole } from "@koe/core";
import { FastifyInstance } from "fastify";

describe("Reactions API Seam Integration Tests", () => {
  let app: FastifyInstance;
  let memDb: Database;
  const jwtSecret = "test-jwt-secret-at-least-32-chars-long";

  beforeEach(async () => {
    const { db } = await createMemDb();
    memDb = db;
    app = buildApp({ db, jwtSecret, logger: false });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  async function createThread(ref = "reaction-post"): Promise<string> {
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

  async function listComments(threadId: string, token?: string) {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/threads/${threadId}/comments`,
      ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
    });
    expect(response.statusCode).toBe(200);
    return response.json();
  }

  async function approveComment(commentId: string, token?: string): Promise<void> {
    const modToken = token ?? (await userToken("moderator"));
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/moderation/actions",
      headers: { authorization: `Bearer ${modToken}` },
      payload: { commentId, action: "approve" },
    });
    expect(response.statusCode).toBe(200);
  }

  function reactRequest(commentId: string, token: string, emoji: unknown) {
    return app.inject({
      method: "POST",
      url: `/api/v1/comments/${commentId}/reactions`,
      headers: { authorization: `Bearer ${token}` },
      payload: { emoji },
    });
  }

  function unreactRequest(
    commentId: string,
    token: string,
    emoji: string
  ) {
    return app.inject({
      method: "DELETE",
      url: `/api/v1/comments/${commentId}/reactions/${encodeURIComponent(emoji)}`,
      headers: { authorization: `Bearer ${token}` },
    });
  }

  it("POST requires authentication", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "reactable");

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/comments/${commentId}/reactions`,
      payload: { emoji: "👍" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.headers["content-type"]).toContain("application/problem+json");
  });

  it("POST rejects a malformed comment identifier", async () => {
    const token = await anonToken();

    const response = await reactRequest("not-a-uuid", token, "👍");

    expect(response.statusCode).toBe(400);
    expect(response.headers["content-type"]).toContain("application/problem+json");
  });

  it("POST rejects a non-emoji value", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "reactable");

    for (const emoji of ["not-an-emoji", "", "a👍b", "👎👎", "❤"]) {
      const response = await reactRequest(commentId, token, emoji);
      expect(response.statusCode).toBe(400);
      expect(response.headers["content-type"]).toContain("application/problem+json");
    }
  });

  it("POST rejects an emoji outside the configured allowlist", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "reactable");

    const response = await reactRequest(commentId, token, "🤡");

    expect(response.statusCode).toBe(400);
    expect(response.json().detail).toBe("Invalid reaction emoji");
  });

  it("POST returns 404 for an unknown comment", async () => {
    const token = await anonToken();

    const response = await reactRequest(
      "123e4567-e89b-12d3-a456-426614174000",
      token,
      "👍"
    );

    expect(response.statusCode).toBe(404);
    expect(response.json().detail).toBe("Comment does not exist");
  });

  it("POST creating a reaction returns 201 and increments the total", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "like me");
    await approveComment(commentId);

    const response = await reactRequest(commentId, token, "👍");
    expect(response.statusCode).toBe(201);
    const reaction = response.json();
    expect(reaction.commentId).toBeUndefined();
    expect(reaction.targetType).toBe("comment");
    expect(reaction.targetId).toBe(commentId);
    expect(reaction.emoji).toBe("👍");

    const parseResult = ReactionSchema.safeParse(reaction);
    expect(parseResult.success).toBe(true);

    const list = await listComments(threadId);
    expect(list.comments[0].reactionTotals).toEqual({ "👍": 1 });
  });

  it("POST reacting with the same emoji again toggles the reaction off", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "toggle me");
    await approveComment(commentId);

    const first = await reactRequest(commentId, token, "👍");
    expect(first.statusCode).toBe(201);

    const second = await reactRequest(commentId, token, "👍");
    expect(second.statusCode).toBe(204);

    const list = await listComments(threadId);
    expect(list.comments[0].reactionTotals).toEqual({});
  });

  it("counts the same emoji from multiple users", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const secondUserToken = await anonToken();
    const commentId = await postComment(threadId, token, "multi");
    await approveComment(commentId);

    await reactRequest(commentId, token, "👍");
    await reactRequest(commentId, secondUserToken, "👍");

    const list = await listComments(threadId);
    expect(list.comments[0].reactionTotals).toEqual({ "👍": 2 });
  });

  it("accumulates multiple distinct emojis from one user", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "multi emoji");
    await approveComment(commentId);

    await reactRequest(commentId, token, "👍");
    await reactRequest(commentId, token, "❤️");

    const list = await listComments(threadId);
    expect(list.comments[0].reactionTotals).toEqual({ "👍": 1, "❤️": 1 });
  });

  it("DELETE removes the user's reaction and decrements the total, idempotently", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "delete me");
    await approveComment(commentId);

    await reactRequest(commentId, token, "🎉");

    const first = await unreactRequest(commentId, token, "🎉");
    expect(first.statusCode).toBe(204);

    const second = await unreactRequest(commentId, token, "🎉");
    expect(second.statusCode).toBe(204);

    const list = await listComments(threadId);
    expect(list.comments[0].reactionTotals).toEqual({});
  });

  it("DELETE requires authentication", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "protect me");

    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/comments/${commentId}/reactions/👍`,
    });

    expect(response.statusCode).toBe(401);
  });

  it("DELETE rejects a malformed emoji parameter", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "bad emoji");

    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/comments/${commentId}/reactions/not-an-emoji`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers["content-type"]).toContain("application/problem+json");
  });

  it("DELETE rejects an emoji outside the configured allowlist", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "bad emoji");

    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/comments/${commentId}/reactions/${encodeURIComponent("🤡")}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers["content-type"]).toContain("application/problem+json");
  });

  it("DELETE returns 404 for an unknown comment", async () => {
    const token = await anonToken();

    const response = await unreactRequest(
      "123e4567-e89b-12d3-a456-426614174000",
      token,
      "👍"
    );

    expect(response.statusCode).toBe(404);
    expect(response.json().detail).toBe("Comment does not exist");
  });

  it("GET comments exposes the current user's reactions only when authenticated", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "state");
    await approveComment(commentId);

    await reactRequest(commentId, token, "❤️");

    const anonymous = await listComments(threadId);
    expect(anonymous.comments[0].userReactions).toEqual([]);

    const authenticated = await listComments(threadId, token);
    expect(authenticated.comments[0].userReactions).toEqual(["❤️"]);
  });

  it("honors a custom configured allowlist", async () => {
    const { db } = await createMemDb();
    const customApp = buildApp({
      db,
      jwtSecret,
      logger: false,
      reactionAllowlist: ["🎉"],
    });
    await customApp.ready();
    try {
      const threadResponse = await customApp.inject({
        method: "GET",
        url: "/api/v1/threads/by-ref/custom-allowlist",
      });
      const threadId = threadResponse.json().id;

      const tokenResponse = await customApp.inject({
        method: "POST",
        url: "/api/v1/auth/anonymous",
      });
      const token = tokenResponse.json().accessToken;

      const commentResponse = await customApp.inject({
        method: "POST",
        url: `/api/v1/threads/${threadId}/comments`,
        headers: { authorization: `Bearer ${token}` },
        payload: { bodyMd: "custom allowlist" },
      });
      const commentId = commentResponse.json().id;

      const rejected = await customApp.inject({
        method: "POST",
        url: `/api/v1/comments/${commentId}/reactions`,
        headers: { authorization: `Bearer ${token}` },
        payload: { emoji: "👍" },
      });
      expect(rejected.statusCode).toBe(400);

      const accepted = await customApp.inject({
        method: "POST",
        url: `/api/v1/comments/${commentId}/reactions`,
        headers: { authorization: `Bearer ${token}` },
        payload: { emoji: "🎉" },
      });
      expect(accepted.statusCode).toBe(201);
    } finally {
      await customApp.close();
    }
  });
});