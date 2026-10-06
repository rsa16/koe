import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb, Database, users } from "@koe/db";
import { eq } from "drizzle-orm";
import { AdminSessionSchema, AdminSessionUserSchema, UserRole } from "@koe/core";
import { signAccessToken } from "@koe/auth";
import { FastifyInstance } from "fastify";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

interface SessionCookies {
  session: string;
  csrf: string;
}

describe("Admin UI API Seam Integration Tests", () => {
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
    return signAccessToken({ userId, role }, { secret: jwtSecret, expiresIn: "15m" });
  }

  function cookieValue(
    cookies: Array<{ name: string; value: string }> | undefined,
    name: string
  ): string | undefined {
    return cookies?.find((cookie) => cookie.name === name)?.value;
  }

  async function login(role: UserRole = "moderator"): Promise<SessionCookies> {
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

  async function createThread(ref = "admin-post"): Promise<string> {
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

  describe("POST /api/v1/admin/session", () => {
    it("requires a bearer token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/session",
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("rejects non-moderator roles", async () => {
      const memberToken = await userToken("member");
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/session",
        headers: { authorization: `Bearer ${memberToken}` },
      });

      expect(response.statusCode).toBe(403);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("issues HttpOnly session and readable CSRF cookies for a moderator", async () => {
      const token = await userToken("moderator");
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/session",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(AdminSessionSchema.safeParse(body).success).toBe(true);
      expect(body.user.role).toBe("moderator");
      expect(typeof body.csrfToken).toBe("string");

      const sessionCookie = response.cookies.find(
        (cookie) => cookie.name === "koe_admin_session"
      );
      const csrfCookie = response.cookies.find(
        (cookie) => cookie.name === "koe_csrf"
      );
      expect(sessionCookie?.httpOnly).toBe(true);
      expect(Boolean(csrfCookie?.httpOnly)).toBe(false);
      expect(csrfCookie?.value).toBe(body.csrfToken);
      expect(sessionCookie?.sameSite).toBe("Lax");
    });
  });

  describe("GET /api/v1/admin/session", () => {
    it("returns 401 without a session cookie", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/session",
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("returns the current user with a session cookie", async () => {
      const { session, csrf } = await login("admin");
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/session",
        cookies: { koe_admin_session: session, koe_csrf: csrf },
      });

      expect(response.statusCode).toBe(200);
      expect(AdminSessionUserSchema.safeParse(response.json()).success).toBe(
        true
      );
      expect(response.json().user.role).toBe("admin");
    });

    it("rejects a tampered session cookie", async () => {
      const { session, csrf } = await login();
      const tampered = `${session.split(".").slice(0, 2).join(".")}.forged`;
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/session",
        cookies: { koe_admin_session: tampered, koe_csrf: csrf },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("DELETE /api/v1/admin/session", () => {
    it("requires a CSRF token", async () => {
      const { session, csrf } = await login();
      const response = await app.inject({
        method: "DELETE",
        url: "/api/v1/admin/session",
        cookies: { koe_admin_session: session, koe_csrf: csrf },
      });

      expect(response.statusCode).toBe(403);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("clears the session cookies when the CSRF token matches", async () => {
      const { session, csrf } = await login();
      const response = await app.inject({
        method: "DELETE",
        url: "/api/v1/admin/session",
        cookies: { koe_admin_session: session, koe_csrf: csrf },
        headers: { "x-csrf-token": csrf },
      });

      expect(response.statusCode).toBe(204);
      const clearedSession = response.cookies.find(
        (cookie) => cookie.name === "koe_admin_session"
      );
      expect(clearedSession?.value).toBe("");
    });
  });

  describe("admin moderation via session cookie", () => {
    it("returns 401 for the queue without a session", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/moderation/queue",
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns the pending queue with a session cookie", async () => {
      const { session, csrf } = await login("moderator");
      const threadId = await createThread("admin-queue-post");
      const authorToken = await anonToken();
      await postComment(threadId, authorToken, "needs review");

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/moderation/queue",
        cookies: { koe_admin_session: session, koe_csrf: csrf },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().comments).toHaveLength(1);
      expect(response.json().comments[0].bodyMd).toBe("needs review");
    });

    it("rejects a moderation action without the CSRF header", async () => {
      const { session, csrf } = await login("moderator");
      const threadId = await createThread("admin-csrf-post");
      const authorToken = await anonToken();
      const commentId = await postComment(threadId, authorToken, "review me");

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/moderation/actions",
        cookies: { koe_admin_session: session, koe_csrf: csrf },
        payload: { commentId, action: "approve" },
      });

      expect(response.statusCode).toBe(403);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("rejects a moderation action with a mismatched CSRF header", async () => {
      const { session, csrf } = await login("moderator");
      const threadId = await createThread("admin-csrf-mismatch-post");
      const authorToken = await anonToken();
      const commentId = await postComment(threadId, authorToken, "review me");

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/moderation/actions",
        cookies: { koe_admin_session: session, koe_csrf: csrf },
        headers: { "x-csrf-token": "not-the-token" },
        payload: { commentId, action: "approve" },
      });

      expect(response.statusCode).toBe(403);
    });

    it("approves a pending comment when the CSRF token matches", async () => {
      const { session, csrf } = await login("moderator");
      const threadId = await createThread("admin-approve-post");
      const authorToken = await anonToken();
      const commentId = await postComment(threadId, authorToken, "approve me");

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/moderation/actions",
        cookies: { koe_admin_session: session, koe_csrf: csrf },
        headers: { "x-csrf-token": csrf },
        payload: { commentId, action: "approve" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("published");
    });
  });

  describe("spam moderation action", () => {
    it("marks a pending comment as spam and removes it from the queue", async () => {
      const threadId = await createThread("spam-post");
      const authorToken = await anonToken();
      const modToken = await userToken("moderator");
      const commentId = await postComment(threadId, authorToken, "buy cheap pills");

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/moderation/actions",
        headers: { authorization: `Bearer ${modToken}` },
        payload: { commentId, action: "spam" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("spam");

      const queue = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/queue",
        headers: { authorization: `Bearer ${modToken}` },
      });
      expect(queue.json().comments).toHaveLength(0);

      const list = await app.inject({
        method: "GET",
        url: `/api/v1/threads/${threadId}/comments`,
      });
      expect(list.json().total).toBe(0);
    });

    it("records a spam action in the audit log", async () => {
      const threadId = await createThread("spam-audit-post");
      const authorToken = await anonToken();
      const modToken = await userToken("moderator");
      const adminToken = await userToken("admin");
      const commentId = await postComment(threadId, authorToken, "spam me");

      await app.inject({
        method: "POST",
        url: "/api/v1/moderation/actions",
        headers: { authorization: `Bearer ${modToken}` },
        payload: { commentId, action: "spam" },
      });

      const audit = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/actions",
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const entry = audit
        .json()
        .actions.find(
          (record: { targetId: string }) => record.targetId === commentId
        );
      expect(entry.action).toBe("spam");
      expect(entry.metadata.previousStatus).toBe("pending");
    });

    it("supports spam through the admin session API", async () => {
      const { session, csrf } = await login("moderator");
      const threadId = await createThread("admin-spam-post");
      const authorToken = await anonToken();
      const commentId = await postComment(threadId, authorToken, "spam it");

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/moderation/actions",
        cookies: { koe_admin_session: session, koe_csrf: csrf },
        headers: { "x-csrf-token": csrf },
        payload: { commentId, action: "spam" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("spam");
    });
  });
});

describe("Admin SPA static hosting", () => {
  let adminDistPath: string;
  let app: FastifyInstance;

  beforeEach(async () => {
    adminDistPath = mkdtempSync(path.join(os.tmpdir(), "koe-admin-"));
    mkdirSync(path.join(adminDistPath, "assets"), { recursive: true });
    writeFileSync(
      path.join(adminDistPath, "index.html"),
      "<!doctype html><html><body><div id=\"root\">admin</div></body></html>"
    );
    writeFileSync(path.join(adminDistPath, "assets", "app.js"), "console.log(1)");

    const { db } = await createMemDb();
    app = buildApp({
      db,
      jwtSecret: "test-jwt-secret-at-least-32-chars-long",
      logger: false,
      adminDistPath,
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    rmSync(adminDistPath, { recursive: true, force: true });
  });

  it("redirects /admin to /admin/", async () => {
    const response = await app.inject({ method: "GET", url: "/admin" });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/admin/");
  });

  it("serves the SPA index at /admin/", async () => {
    const response = await app.inject({ method: "GET", url: "/admin/" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("id=\"root\"");
  });

  it("serves built assets", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/admin/assets/app.js",
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("console.log");
  });

  it("falls back to index.html for client-side routes", async () => {
    const response = await app.inject({ method: "GET", url: "/admin/queue" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("id=\"root\"");
  });

  it("does not alter unknown non-admin routes", async () => {
    const response = await app.inject({ method: "GET", url: "/nope" });
    expect(response.statusCode).toBe(404);
  });
});
