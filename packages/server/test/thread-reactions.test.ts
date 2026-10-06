import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb } from "@koe/db";
import { ReactionSchema } from "@koe/core";
import { FastifyInstance } from "fastify";

describe("Thread Reactions API Seam Integration Tests", () => {
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

  async function createThread(ref = "article-reactions"): Promise<string> {
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

  async function getThread(ref: string, token?: string) {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/threads/by-ref/${encodeURIComponent(ref)}`,
      ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
    });
    expect(response.statusCode).toBe(200);
    return response.json();
  }

  function reactRequest(threadId: string, token: string, emoji: unknown) {
    return app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/reactions`,
      headers: { authorization: `Bearer ${token}` },
      payload: { emoji },
    });
  }

  function unreactRequest(threadId: string, token: string, emoji: string) {
    return app.inject({
      method: "DELETE",
      url: `/api/v1/threads/${threadId}/reactions/${encodeURIComponent(emoji)}`,
      headers: { authorization: `Bearer ${token}` },
    });
  }

  it("POST requires authentication", async () => {
    const threadId = await createThread();

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/reactions`,
      payload: { emoji: "👍" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json"
    );
  });

  it("POST rejects a malformed thread identifier", async () => {
    const token = await anonToken();

    const response = await reactRequest("not-a-uuid", token, "👍");

    expect(response.statusCode).toBe(400);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json"
    );
  });

  it("POST rejects a non-emoji value", async () => {
    const threadId = await createThread();
    const token = await anonToken();

    for (const emoji of ["not-an-emoji", "", "a👍b", "👎👎", "❤"]) {
      const response = await reactRequest(threadId, token, emoji);
      expect(response.statusCode).toBe(400);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    }
  });

  it("POST rejects an emoji outside the configured allowlist", async () => {
    const threadId = await createThread();
    const token = await anonToken();

    const response = await reactRequest(threadId, token, "🤡");

    expect(response.statusCode).toBe(400);
    expect(response.json().detail).toBe("Invalid reaction emoji");
  });

  it("POST returns 404 for an unknown thread", async () => {
    const token = await anonToken();

    const response = await reactRequest(
      "123e4567-e89b-12d3-a456-426614174000",
      token,
      "👍"
    );

    expect(response.statusCode).toBe(404);
    expect(response.json().detail).toBe("Thread does not exist");
  });

  it("POST creating a reaction returns 201 and increments the total", async () => {
    const threadId = await createThread("article-create");
    const token = await anonToken();

    const response = await reactRequest(threadId, token, "👍");
    expect(response.statusCode).toBe(201);
    const reaction = response.json();
    expect(reaction.targetType).toBe("thread");
    expect(reaction.targetId).toBe(threadId);
    expect(reaction.emoji).toBe("👍");

    const parseResult = ReactionSchema.safeParse(reaction);
    expect(parseResult.success).toBe(true);

    const thread = await getThread("article-create");
    expect(thread.reactionTotals).toEqual({ "👍": 1 });
  });

  it("POST reacting with the same emoji again toggles the reaction off", async () => {
    const threadId = await createThread("article-toggle");
    const token = await anonToken();

    const first = await reactRequest(threadId, token, "👍");
    expect(first.statusCode).toBe(201);

    const second = await reactRequest(threadId, token, "👍");
    expect(second.statusCode).toBe(204);

    const thread = await getThread("article-toggle");
    expect(thread.reactionTotals).toEqual({});
  });

  it("counts the same emoji from multiple users", async () => {
    const threadId = await createThread("article-multi");
    const token = await anonToken();
    const secondUserToken = await anonToken();

    await reactRequest(threadId, token, "👍");
    await reactRequest(threadId, secondUserToken, "👍");

    const thread = await getThread("article-multi");
    expect(thread.reactionTotals).toEqual({ "👍": 2 });
  });

  it("DELETE removes the user's reaction and decrements the total, idempotently", async () => {
    const threadId = await createThread("article-delete");
    const token = await anonToken();

    await reactRequest(threadId, token, "🎉");

    const first = await unreactRequest(threadId, token, "🎉");
    expect(first.statusCode).toBe(204);

    const second = await unreactRequest(threadId, token, "🎉");
    expect(second.statusCode).toBe(204);

    const thread = await getThread("article-delete");
    expect(thread.reactionTotals).toEqual({});
  });

  it("DELETE requires authentication", async () => {
    const threadId = await createThread("article-protect");

    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/threads/${threadId}/reactions/👍`,
    });

    expect(response.statusCode).toBe(401);
  });

  it("DELETE rejects a malformed emoji parameter", async () => {
    const threadId = await createThread("article-bad-emoji");
    const token = await anonToken();

    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/threads/${threadId}/reactions/not-an-emoji`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json"
    );
  });

  it("DELETE returns 404 for an unknown thread", async () => {
    const token = await anonToken();

    const response = await unreactRequest(
      "123e4567-e89b-12d3-a456-426614174000",
      token,
      "👍"
    );

    expect(response.statusCode).toBe(404);
    expect(response.json().detail).toBe("Thread does not exist");
  });

  it("GET thread exposes the current user's reactions only when authenticated", async () => {
    const threadId = await createThread("article-state");
    const token = await anonToken();

    await reactRequest(threadId, token, "❤️");

    const anonymous = await getThread("article-state");
    expect(anonymous.userReactions).toEqual([]);

    const authenticated = await getThread("article-state", token);
    expect(authenticated.userReactions).toEqual(["❤️"]);
  });
});
