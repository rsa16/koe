import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb, Database, users } from "@koe/db";
import { eq } from "drizzle-orm";
import {
  AdminSettingsSchema,
  AdminUserListResponseSchema,
  UserRole,
  UserSchema,
} from "@koe/core";
import { signAccessToken } from "@koe/auth";
import { FastifyInstance } from "fastify";

interface SessionCookies {
  session: string;
  csrf: string;
}

describe("Admin Users & Settings API", () => {
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

  async function anonUser(): Promise<{ id: string; token: string }> {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/anonymous",
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    return { id: body.user.id, token: body.accessToken };
  }

  async function userToken(role: UserRole): Promise<string> {
    const { id } = await anonUser();
    await memDb.update(users).set({ role }).where(eq(users.id, id));
    return signAccessToken({ userId: id, role }, { secret: jwtSecret, expiresIn: "15m" });
  }

  function cookieValue(
    cookies: Array<{ name: string; value: string }> | undefined,
    name: string
  ): string | undefined {
    return cookies?.find((cookie) => cookie.name === name)?.value;
  }

  async function login(role: UserRole): Promise<SessionCookies> {
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

  describe("GET /api/v1/admin/users", () => {
    it("requires a session cookie", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/users",
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("returns a paginated list of users for an admin session", async () => {
      const { session, csrf } = await login("admin");
      await anonUser();
      await anonUser();

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/users",
        cookies: { koe_admin_session: session, koe_csrf: csrf },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(AdminUserListResponseSchema.safeParse(body).success).toBe(true);
      expect(body.total).toBeGreaterThanOrEqual(3);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(20);
      expect(body.users.length).toBe(body.total);
      expect(UserSchema.safeParse(body.users[0]).success).toBe(true);
    });

    it("paginates with page and pageSize", async () => {
      const { session, csrf } = await login("admin");
      await anonUser();
      await anonUser();
      await anonUser();

      const first = await app.inject({
        method: "GET",
        url: "/api/v1/admin/users?page=1&pageSize=2",
        cookies: { koe_admin_session: session, koe_csrf: csrf },
      });
      const second = await app.inject({
        method: "GET",
        url: "/api/v1/admin/users?page=2&pageSize=2",
        cookies: { koe_admin_session: session, koe_csrf: csrf },
      });

      expect(first.statusCode).toBe(200);
      expect(first.json().users).toHaveLength(2);
      expect(first.json().pageSize).toBe(2);
      expect(second.json().users.length).toBe(first.json().total - 2);
      const firstIds = new Set(first.json().users.map((u: { id: string }) => u.id));
      for (const user of second.json().users) {
        expect(firstIds.has(user.id)).toBe(false);
      }
    });

    it("filters by role and status", async () => {
      const { session, csrf } = await login("admin");
      const target = await anonUser();
      await memDb
        .update(users)
        .set({ role: "moderator", status: "suspended" })
        .where(eq(users.id, target.id));

      const byRole = await app.inject({
        method: "GET",
        url: "/api/v1/admin/users?role=moderator",
        cookies: { koe_admin_session: session, koe_csrf: csrf },
      });
      expect(byRole.statusCode).toBe(200);
      expect(
        byRole.json().users.every((u: { role: string }) => u.role === "moderator")
      ).toBe(true);

      const byStatus = await app.inject({
        method: "GET",
        url: "/api/v1/admin/users?status=suspended",
        cookies: { koe_admin_session: session, koe_csrf: csrf },
      });
      expect(byStatus.statusCode).toBe(200);
      expect(byStatus.json().users.map((u: { id: string }) => u.id)).toContain(
        target.id
      );
      expect(
        byStatus.json().users.every((u: { status: string }) => u.status === "suspended")
      ).toBe(true);
    });

    it("searches by name or email", async () => {
      const { session, csrf } = await login("admin");
      const target = await anonUser();
      await memDb
        .update(users)
        .set({ name: "Ada Lovelace", email: "ada@example.com" })
        .where(eq(users.id, target.id));

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/users?search=ada",
        cookies: { koe_admin_session: session, koe_csrf: csrf },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().users.map((u: { id: string }) => u.id)).toEqual([
        target.id,
      ]);
    });
  });

  describe("PATCH /api/v1/admin/users/:id", () => {
    it("requires a session cookie", async () => {
      const target = await anonUser();
      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/users/${target.id}`,
        payload: { role: "moderator" },
      });

      expect(response.statusCode).toBe(401);
    });

    it("requires a CSRF header", async () => {
      const { session, csrf } = await login("admin");
      const target = await anonUser();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/users/${target.id}`,
        cookies: { koe_admin_session: session, koe_csrf: csrf },
        payload: { role: "moderator" },
      });

      expect(response.statusCode).toBe(403);
    });

    it("rejects invalid payloads and unknown users", async () => {
      const { session, csrf } = await login("admin");
      const target = await anonUser();

      const empty = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/users/${target.id}`,
        cookies: { koe_admin_session: session, koe_csrf: csrf },
        headers: { "x-csrf-token": csrf },
        payload: {},
      });
      expect(empty.statusCode).toBe(400);

      const badRole = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/users/${target.id}`,
        cookies: { koe_admin_session: session, koe_csrf: csrf },
        headers: { "x-csrf-token": csrf },
        payload: { role: "superadmin" },
      });
      expect(badRole.statusCode).toBe(400);

      const missing = await app.inject({
        method: "PATCH",
        url: "/api/v1/admin/users/123e4567-e89b-12d3-a456-426614174000",
        cookies: { koe_admin_session: session, koe_csrf: csrf },
        headers: { "x-csrf-token": csrf },
        payload: { role: "moderator" },
      });
      expect(missing.statusCode).toBe(404);
    });

    it("updates a user's role", async () => {
      const { session, csrf } = await login("admin");
      const target = await anonUser();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/users/${target.id}`,
        cookies: { koe_admin_session: session, koe_csrf: csrf },
        headers: { "x-csrf-token": csrf },
        payload: { role: "moderator" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().role).toBe("moderator");
      expect(UserSchema.safeParse(response.json()).success).toBe(true);
    });

    it("bans a user, writes an audit record, and hides their comments", async () => {
      const { session, csrf } = await login("admin");
      const author = await anonUser();

      const thread = await app.inject({
        method: "GET",
        url: "/api/v1/threads/by-ref/admin-ban-user",
      });
      const threadId = thread.json().id;
      await app.inject({
        method: "POST",
        url: `/api/v1/threads/${threadId}/comments`,
        headers: { authorization: `Bearer ${author.token}` },
        payload: { bodyMd: "hello" },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/users/${author.id}`,
        cookies: { koe_admin_session: session, koe_csrf: csrf },
        headers: { "x-csrf-token": csrf },
        payload: { status: "banned" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("banned");

      const adminToken = await userToken("admin");
      const audit = await app.inject({
        method: "GET",
        url: "/api/v1/moderation/actions",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const entry = audit
        .json()
        .actions.find(
          (record: { targetId: string }) => record.targetId === author.id
        );
      expect(entry.action).toBe("ban");
      expect(entry.targetType).toBe("user");
    });

    it("suspends then reactivates a user", async () => {
      const { session, csrf } = await login("admin");
      const target = await anonUser();

      const suspend = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/users/${target.id}`,
        cookies: { koe_admin_session: session, koe_csrf: csrf },
        headers: { "x-csrf-token": csrf },
        payload: { status: "suspended" },
      });
      expect(suspend.statusCode).toBe(200);
      expect(suspend.json().status).toBe("suspended");

      const reactivate = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/users/${target.id}`,
        cookies: { koe_admin_session: session, koe_csrf: csrf },
        headers: { "x-csrf-token": csrf },
        payload: { status: "active" },
      });
      expect(reactivate.statusCode).toBe(200);
      expect(reactivate.json().status).toBe("active");
    });
  });

  describe("GET /api/v1/admin/settings", () => {
    it("requires a session cookie", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/settings",
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns the effective read-only configuration", async () => {
      const { session, csrf } = await login("admin");
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/settings",
        cookies: { koe_admin_session: session, koe_csrf: csrf },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(AdminSettingsSchema.safeParse(body).success).toBe(true);
      expect(body.reactionAllowlist.length).toBeGreaterThan(0);
      expect(body.googleOAuthEnabled).toBe(false);
    });

    it("reflects a configured reaction allowlist and Google OAuth", async () => {
      const { db } = await createMemDb();
      const configured = buildApp({
        db,
        jwtSecret,
        logger: false,
        reactionAllowlist: ["🔥"],
        googleOAuth: {} as never,
      });
      await configured.ready();
      try {
        const token = await (async () => {
          const anon = await configured.inject({
            method: "POST",
            url: "/api/v1/auth/anonymous",
          });
          const id = anon.json().user.id;
          await db.update(users).set({ role: "admin" }).where(eq(users.id, id));
          return signAccessToken(
            { userId: id, role: "admin" },
            { secret: jwtSecret, expiresIn: "15m" }
          );
        })();
        const sessionRes = await configured.inject({
          method: "POST",
          url: "/api/v1/admin/session",
          headers: { authorization: `Bearer ${token}` },
        });
        const cookies = Object.fromEntries(
          sessionRes.cookies.map((cookie) => [cookie.name, cookie.value])
        );

        const response = await configured.inject({
          method: "GET",
          url: "/api/v1/admin/settings",
          cookies,
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().reactionAllowlist).toEqual(["🔥"]);
        expect(response.json().googleOAuthEnabled).toBe(true);
      } finally {
        await configured.close();
      }
    });
  });
});
