import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb, Database, users } from "@koe/db";
import { eq } from "drizzle-orm";
import {
  AdminCommentListResponseSchema,
  AdminCommentThreadListResponseSchema,
  UserRole,
} from "@koe/core";
import { signAccessToken } from "@koe/auth";
import { FastifyInstance } from "fastify";

interface SessionCookies {
  session: string;
  csrf: string;
}

describe("Admin comments console API Seam Integration Tests", () => {
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

  async function anonToken(): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/anonymous",
    });
    expect(response.statusCode).toBe(200);
    return response.json().accessToken;
  }

  async function userToken(role: UserRole): Promise<string> {
    const guestToken = await anonToken();
    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${guestToken}` },
    });
    const userId = meRes.json().id;
    await memDb.update(users).set({ role }).where(eq(users.id, userId));
    return signAccessToken(
      { userId, role },
      { secret: jwtSecret, expiresIn: "15m" }
    );
  }

  function cookieValue(
    cookies: Array<{ name: string; value: string }> | undefined,
    name: string
  ): string | undefined {
    return cookies?.find((cookie) => cookie.name === name)?.value;
  }

  async function login(role: UserRole = "admin"): Promise<SessionCookies> {
    const token = await userToken(role);
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/admin/session",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    const session = cookieValue(response.cookies, "koe_admin_session");
    const csrf = cookieValue(response.cookies, "koe_csrf");
    expect(session).toBeDefined();
    expect(csrf).toBeDefined();
    return { session: session!, csrf: csrf! };
  }

  async function createThread(ref: string): Promise<string> {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/threads/by-ref/${encodeURIComponent(ref)}`,
    });
    expect(response.statusCode).toBe(200);
    return response.json().id;
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

  async function approve(commentId: string, token?: string) {
    const moderatorToken = token ?? (await userToken("moderator"));
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/moderation/actions",
      headers: { authorization: `Bearer ${moderatorToken}` },
      payload: { commentId, action: "approve" },
    });
    expect(response.statusCode).toBe(200);
  }

  function listComments(
    cookies: SessionCookies,
    query: Record<string, string | number> = {}
  ) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      search.set(key, String(value));
    }
    const suffix = search.toString();
    return app.inject({
      method: "GET",
      url: `/api/v1/admin/comments${suffix ? `?${suffix}` : ""}`,
      cookies: {
        koe_admin_session: cookies.session,
        koe_csrf: cookies.csrf,
      },
    });
  }

  function bulkAction(
    cookies: SessionCookies,
    body: Record<string, unknown>,
    withCsrf = true
  ) {
    return app.inject({
      method: "POST",
      url: "/api/v1/admin/comments/actions",
      cookies: {
        koe_admin_session: cookies.session,
        koe_csrf: cookies.csrf,
      },
      headers: withCsrf ? { "x-csrf-token": cookies.csrf } : {},
      payload: body,
    });
  }

  describe("access control", () => {
    it("requires an admin session", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/comments",
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("forbids moderators", async () => {
      const cookies = await login("moderator");
      const response = await listComments(cookies);

      expect(response.statusCode).toBe(403);
    });
  });

  describe("GET /api/v1/admin/comments", () => {
    it("lists comments with thread and author context", async () => {
      const cookies = await login();
      const threadId = await createThread("console-list");
      const authorToken = await anonToken();
      await postComment(threadId, authorToken, "first");
      await postComment(threadId, authorToken, "second");

      const response = await listComments(cookies);

      expect(response.statusCode).toBe(200);
      const parsed = AdminCommentListResponseSchema.parse(response.json());
      expect(parsed.total).toBe(2);
      expect(parsed.comments).toHaveLength(2);
      expect(parsed.comments[0].thread.externalRef).toBe("console-list");
      expect(parsed.comments[0].authorName).toBeNull();
    });

    it("filters by status", async () => {
      const cookies = await login();
      const moderatorToken = await userToken("moderator");
      const threadId = await createThread("console-status");
      const authorToken = await anonToken();
      const pending = await postComment(threadId, authorToken, "pending one");
      const published = await postComment(threadId, authorToken, "published one");
      await approve(published.id as string, moderatorToken);

      const pendingList = await listComments(cookies, { status: "pending" });
      expect(pendingList.json().total).toBe(1);
      expect(pendingList.json().comments[0].id).toBe(pending.id);

      const publishedList = await listComments(cookies, {
        status: "published",
      });
      expect(publishedList.json().total).toBe(1);
      expect(publishedList.json().comments[0].id).toBe(published.id);
    });

    it("filters by thread", async () => {
      const cookies = await login();
      const threadA = await createThread("console-thread-a");
      const threadB = await createThread("console-thread-b");
      const authorToken = await anonToken();
      await postComment(threadA, authorToken, "in A");
      await postComment(threadB, authorToken, "in B");

      const response = await listComments(cookies, { threadId: threadA });

      expect(response.json().total).toBe(1);
      expect(response.json().comments[0].bodyMd).toBe("in A");
    });

    it("filters by author", async () => {
      const cookies = await login();
      const threadId = await createThread("console-author");
      const authorToken = await anonToken();
      const otherToken = await anonToken();
      const mine = await postComment(threadId, authorToken, "mine");
      await postComment(threadId, otherToken, "theirs");

      const response = await listComments(cookies, {
        authorId: mine.authorId as string,
      });

      expect(response.json().total).toBe(1);
      expect(response.json().comments[0].bodyMd).toBe("mine");
    });

    it("searches comment bodies", async () => {
      const cookies = await login();
      const threadId = await createThread("console-search");
      const authorToken = await anonToken();
      await postComment(threadId, authorToken, "apples are nice");
      await postComment(threadId, authorToken, "oranges are fine");

      const response = await listComments(cookies, { search: "apples" });

      expect(response.json().total).toBe(1);
      expect(response.json().comments[0].bodyMd).toBe("apples are nice");
    });

    it("paginates", async () => {
      const cookies = await login();
      const threadId = await createThread("console-page");
      const authorToken = await anonToken();
      for (let index = 0; index < 3; index += 1) {
        await postComment(threadId, authorToken, `comment ${index}`);
      }

      const response = await listComments(cookies, { page: 1, pageSize: 2 });

      expect(response.json().total).toBe(3);
      expect(response.json().comments).toHaveLength(2);
      expect(response.json().page).toBe(1);
    });
  });

  describe("GET /api/v1/admin/comments/threads", () => {
    it("lists threads with comment counts", async () => {
      const cookies = await login();
      const threadId = await createThread("console-thread-count");
      const authorToken = await anonToken();
      await postComment(threadId, authorToken, "one");
      await postComment(threadId, authorToken, "two");

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/comments/threads",
        cookies: {
          koe_admin_session: cookies.session,
          koe_csrf: cookies.csrf,
        },
      });

      expect(response.statusCode).toBe(200);
      const parsed = AdminCommentThreadListResponseSchema.parse(
        response.json()
      );
      const thread = parsed.threads.find(
        (item) => item.id === threadId
      );
      expect(thread?.externalRef).toBe("console-thread-count");
      expect(thread?.commentCount).toBe(2);
    });
  });

  describe("POST /api/v1/admin/comments/actions", () => {
    it("requires the CSRF header", async () => {
      const cookies = await login();
      const threadId = await createThread("console-bulk-csrf");
      const authorToken = await anonToken();
      const comment = await postComment(threadId, authorToken, "bulk me");

      const response = await bulkAction(
        cookies,
        { commentIds: [comment.id], action: "delete" },
        false
      );

      expect(response.statusCode).toBe(403);
    });

    it("bulk deletes comments", async () => {
      const cookies = await login();
      const threadId = await createThread("console-bulk-delete");
      const authorToken = await anonToken();
      const first = await postComment(threadId, authorToken, "one");
      const second = await postComment(threadId, authorToken, "two");
      await approve(first.id as string);
      await approve(second.id as string);

      const response = await bulkAction(cookies, {
        commentIds: [first.id, second.id],
        action: "delete",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().updated).toBe(2);

      const deleted = await listComments(cookies, { status: "deleted" });
      expect(deleted.json().total).toBe(2);
    });

    it("records an audit entry per bulk deleted comment", async () => {
      const cookies = await login();
      const adminToken = await userToken("admin");
      const threadId = await createThread("console-bulk-audit");
      const authorToken = await anonToken();
      const comment = await postComment(threadId, authorToken, "audit me");
      await approve(comment.id as string);

      await bulkAction(cookies, {
        commentIds: [comment.id],
        action: "delete",
      });

      const audit = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/actions",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const entry = audit
        .json()
        .actions.find(
          (record: { targetId: string }) => record.targetId === comment.id
        );
      expect(entry.action).toBe("delete");
      expect(entry.metadata.previousStatus).toBe("published");
    });

    it("bulk approves pending comments", async () => {
      const cookies = await login();
      const threadId = await createThread("console-bulk-approve");
      const authorToken = await anonToken();
      const first = await postComment(threadId, authorToken, "one");
      const second = await postComment(threadId, authorToken, "two");

      const response = await bulkAction(cookies, {
        commentIds: [first.id, second.id],
        action: "approve",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().updated).toBe(2);

      const published = await listComments(cookies, { status: "published" });
      expect(published.json().total).toBe(2);
    });

    it("bulk marks comments as spam", async () => {
      const cookies = await login();
      const threadId = await createThread("console-bulk-spam");
      const authorToken = await anonToken();
      const comment = await postComment(threadId, authorToken, "spam");

      const response = await bulkAction(cookies, {
        commentIds: [comment.id],
        action: "spam",
      });

      expect(response.statusCode).toBe(200);
      const spam = await listComments(cookies, { status: "spam" });
      expect(spam.json().total).toBe(1);
    });

    it("bulk pins and unpins comments", async () => {
      const cookies = await login();
      const threadId = await createThread("console-bulk-pin");
      const authorToken = await anonToken();
      const comment = await postComment(threadId, authorToken, "pin me");

      const pinned = await bulkAction(cookies, {
        commentIds: [comment.id],
        action: "pin",
      });
      expect(pinned.statusCode).toBe(200);
      expect(pinned.json().updated).toBe(1);

      const afterPin = await listComments(cookies, { threadId });
      expect(afterPin.json().comments[0].pinnedAt).not.toBeNull();

      const unpinned = await bulkAction(cookies, {
        commentIds: [comment.id],
        action: "unpin",
      });
      expect(unpinned.statusCode).toBe(200);

      const afterUnpin = await listComments(cookies, { threadId });
      expect(afterUnpin.json().comments[0].pinnedAt).toBeNull();
    });

    it("ignores unknown comment ids", async () => {
      const cookies = await login();
      const threadId = await createThread("console-bulk-unknown");
      const authorToken = await anonToken();
      const comment = await postComment(threadId, authorToken, "real");

      const response = await bulkAction(cookies, {
        commentIds: [
          comment.id,
          "123e4567-e89b-12d3-a456-426614174000",
        ],
        action: "delete",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().updated).toBe(1);
    });

    it("rejects an empty comment list", async () => {
      const cookies = await login();
      const response = await bulkAction(cookies, {
        commentIds: [],
        action: "delete",
      });

      expect(response.statusCode).toBe(400);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });
  });
});
