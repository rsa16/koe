import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb } from "@koe/db";
import { VoteSchema } from "@koe/core";
import { FastifyInstance } from "fastify";

describe("Votes API Seam Integration Tests", () => {
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

  async function createThread(ref = "vote-post"): Promise<string> {
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

  function voteRequest(
    commentId: string,
    token: string,
    value: unknown
  ) {
    return app.inject({
      method: "POST",
      url: `/api/v1/comments/${commentId}/vote`,
      headers: { authorization: `Bearer ${token}` },
      payload: { value },
    });
  }

  it("POST /api/v1/comments/:id/vote requires authentication", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "votable");

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/comments/${commentId}/vote`,
      payload: { value: 1 },
    });

    expect(response.statusCode).toBe(401);
    expect(response.headers["content-type"]).toContain("application/problem+json");
  });

  it("POST rejects a malformed comment identifier", async () => {
    const token = await anonToken();

    const response = await voteRequest("not-a-uuid", token, 1);

    expect(response.statusCode).toBe(400);
    expect(response.headers["content-type"]).toContain("application/problem+json");
  });

  it("POST rejects an invalid vote value", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "votable");

    for (const value of [0, 2, "up", null]) {
      const response = await voteRequest(commentId, token, value);
      expect(response.statusCode).toBe(400);
      expect(response.headers["content-type"]).toContain("application/problem+json");
    }
  });

  it("POST returns 404 for an unknown comment", async () => {
    const token = await anonToken();

    const response = await voteRequest(
      "123e4567-e89b-12d3-a456-426614174000",
      token,
      1
    );

    expect(response.statusCode).toBe(404);
    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.json().detail).toBe("Comment does not exist");
  });

  it("POST upvoting creates a vote and increments the upvotes counter", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "upvote me");

    const response = await voteRequest(commentId, token, 1);
    expect(response.statusCode).toBe(201);
    const vote = response.json();
    expect(vote.commentId).toBe(commentId);
    expect(vote.value).toBe(1);

    const parseResult = VoteSchema.safeParse(vote);
    expect(parseResult.success).toBe(true);

    const list = await listComments(threadId);
    expect(list.comments[0].upvotes).toBe(1);
    expect(list.comments[0].downvotes).toBe(0);
  });

  it("POST downvoting increments the downvotes counter", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "downvote me");

    const response = await voteRequest(commentId, token, -1);
    expect(response.statusCode).toBe(201);

    const list = await listComments(threadId);
    expect(list.comments[0].upvotes).toBe(0);
    expect(list.comments[0].downvotes).toBe(1);
  });

  it("POST voting the same direction again toggles the vote off and decrements the counter", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "toggle me");

    const first = await voteRequest(commentId, token, 1);
    expect(first.statusCode).toBe(201);

    const second = await voteRequest(commentId, token, 1);
    expect(second.statusCode).toBe(204);

    const list = await listComments(threadId);
    expect(list.comments[0].upvotes).toBe(0);
    expect(list.comments[0].downvotes).toBe(0);
  });

  it("POST switching direction moves the count between counters", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "switch me");

    await voteRequest(commentId, token, 1);
    const switched = await voteRequest(commentId, token, -1);
    expect(switched.statusCode).toBe(200);
    expect(switched.json().value).toBe(-1);

    const list = await listComments(threadId);
    expect(list.comments[0].upvotes).toBe(0);
    expect(list.comments[0].downvotes).toBe(1);
  });

  it("allows one vote per user per comment", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "one per user");

    const secondUserToken = await anonToken();
    await voteRequest(commentId, token, 1);
    await voteRequest(commentId, secondUserToken, 1);

    const list = await listComments(threadId);
    expect(list.comments[0].upvotes).toBe(2);
  });

  it("DELETE removes the user's vote and decrements the counter, idempotently", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "delete me");

    await voteRequest(commentId, token, 1);

    const first = await app.inject({
      method: "DELETE",
      url: `/api/v1/comments/${commentId}/vote`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(first.statusCode).toBe(204);

    const second = await app.inject({
      method: "DELETE",
      url: `/api/v1/comments/${commentId}/vote`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(second.statusCode).toBe(204);

    const list = await listComments(threadId);
    expect(list.comments[0].upvotes).toBe(0);
    expect(list.comments[0].downvotes).toBe(0);
  });

  it("DELETE requires authentication", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "protect me");

    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/comments/${commentId}/vote`,
    });

    expect(response.statusCode).toBe(401);
  });

  it("GET comments exposes the current user's vote state only when authenticated", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "state");

    await voteRequest(commentId, token, 1);

    const anonymous = await listComments(threadId);
    expect(anonymous.comments[0].userVote).toBeNull();

    const authenticated = await listComments(threadId, token);
    expect(authenticated.comments[0].userVote).toBe(1);
  });

  it("GET comments shows null userVote for a voter who has not voted on a comment", async () => {
    const threadId = await createThread();
    const token = await anonToken();
    const otherToken = await anonToken();
    const commentId = await postComment(threadId, token, "no vote");

    await voteRequest(commentId, token, -1);

    const list = await listComments(threadId, otherToken);
    expect(list.comments[0].userVote).toBeNull();
  });
});