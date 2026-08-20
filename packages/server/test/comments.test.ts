import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb } from "@koe/db";
import { CommentSchema, CommentListResponseSchema } from "@koe/core";
import { FastifyInstance } from "fastify";

describe("Comments API Seam Integration Tests", () => {
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

  async function createThread(ref = "e2e-post"): Promise<string> {
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

  it("POST /api/v1/threads/:id/comments requires authentication", async () => {
    const threadId = await createThread();

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/comments`,
      payload: { bodyMd: "Unauthenticated comment" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.headers["content-type"]).toContain("application/problem+json");
  });

  it("POST /api/v1/threads/:id/comments rejects an empty body", async () => {
    const threadId = await createThread();
    const token = await anonToken();

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: { bodyMd: "" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers["content-type"]).toContain("application/problem+json");
  });

  it("POST /api/v1/threads/:id/comments returns 404 for an unknown thread", async () => {
    const token = await anonToken();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/threads/123e4567-e89b-12d3-a456-426614174000/comments",
      headers: { authorization: `Bearer ${token}` },
      payload: { bodyMd: "Comment on missing thread" },
    });

    expect(response.statusCode).toBe(404);
    expect(response.headers["content-type"]).toContain("application/problem+json");
  });

  it("POST /api/v1/threads/:id/comments creates a pending comment on a pre-moderated thread", async () => {
    const threadId = await createThread();
    const token = await anonToken();

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: { bodyMd: "**Hello** from a guest" },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.threadId).toBe(threadId);
    expect(body.bodyMd).toBe("**Hello** from a guest");
    expect(body.bodyHtml).toBe("");
    expect(body.status).toBe("pending");
    expect(body.parentId).toBeNull();
    expect(body.depth).toBe(0);
    expect(body.path).toBe("");
    expect(body.id).toBeDefined();

    const parseResult = CommentSchema.safeParse(body);
    expect(parseResult.success).toBe(true);
  });

  it("E2E: a comment can be posted and read back", async () => {
    const threadId = await createThread("e2e-post");
    const token = await anonToken();

    const postResponse = await app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: { bodyMd: "First comment!" },
    });
    expect(postResponse.statusCode).toBe(201);

    const listResponse = await app.inject({
      method: "GET",
      url: `/api/v1/threads/${threadId}/comments`,
    });
    expect(listResponse.statusCode).toBe(200);
    const list = listResponse.json();
    expect(list.total).toBe(1);
    expect(list.comments).toHaveLength(1);
    expect(list.comments[0].bodyMd).toBe("First comment!");
    expect(list.comments[0].id).toBe(postResponse.json().id);
    expect(list.comments[0].status).toBe("pending");

    const parseResult = CommentListResponseSchema.safeParse(list);
    expect(parseResult.success).toBe(true);
  });

  it("POST increments the thread comment count", async () => {
    const ref = "counted-post";
    const threadId = await createThread(ref);
    const token = await anonToken();

    await app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: { bodyMd: "One" },
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: { bodyMd: "Two" },
    });

    const threadResponse = await app.inject({
      method: "GET",
      url: `/api/v1/threads/by-ref/${ref}`,
    });
    expect(threadResponse.statusCode).toBe(200);
    expect(threadResponse.json().commentCount).toBe(2);
  });

  it("GET /api/v1/threads/:id/comments returns a flat paginated list", async () => {
    const threadId = await createThread();
    const token = await anonToken();

    for (const bodyMd of ["One", "Two", "Three"]) {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/threads/${threadId}/comments`,
        headers: { authorization: `Bearer ${token}` },
        payload: { bodyMd },
      });
      expect(response.statusCode).toBe(201);
    }

    const pageOne = await app.inject({
      method: "GET",
      url: `/api/v1/threads/${threadId}/comments?page=1&pageSize=2`,
    });
    expect(pageOne.statusCode).toBe(200);
    const pageOneBody = pageOne.json();
    expect(pageOneBody.total).toBe(3);
    expect(pageOneBody.page).toBe(1);
    expect(pageOneBody.pageSize).toBe(2);
    expect(pageOneBody.comments).toHaveLength(2);
    expect(pageOneBody.comments.map((c: { bodyMd: string }) => c.bodyMd)).toEqual([
      "One",
      "Two",
    ]);

    const pageTwo = await app.inject({
      method: "GET",
      url: `/api/v1/threads/${threadId}/comments?page=2&pageSize=2`,
    });
    const pageTwoBody = pageTwo.json();
    expect(pageTwoBody.comments).toHaveLength(1);
    expect(pageTwoBody.comments[0].bodyMd).toBe("Three");
  });

  it("GET /api/v1/threads/:id/comments returns 404 for an unknown thread", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/threads/123e4567-e89b-12d3-a456-426614174000/comments",
    });

    expect(response.statusCode).toBe(404);
    expect(response.headers["content-type"]).toContain("application/problem+json");
  });

  it("GET /api/v1/threads/:id/comments rejects an invalid thread identifier", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/threads/not-a-uuid/comments",
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers["content-type"]).toContain("application/problem+json");
  });
});