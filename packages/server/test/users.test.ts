import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb, Database, users } from "@koe/db";
import { eq } from "drizzle-orm";
import { UserRole, UserSchema } from "@koe/core";
import { FastifyInstance } from "fastify";
import { signAccessToken } from "@koe/auth";

describe("Users API Seam Integration Tests", () => {
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

  async function userToken(role: UserRole = "admin"): Promise<{ id: string; token: string }> {
    const { id } = await anonUser();
    await memDb.update(users).set({ role }).where(eq(users.id, id));
    const token = await signAccessToken({ userId: id, role }, { secret: jwtSecret, expiresIn: "15m" });
    return { id, token };
  }

  describe("PATCH /api/v1/users/:id", () => {
    it("requires authentication", async () => {
      const { id } = await anonUser();
      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/users/${id}`,
        payload: { role: "moderator" },
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers["content-type"]).toContain("application/problem+json");
    });

    it("returns 403 Forbidden for non-admin roles (guest, member, moderator)", async () => {
      const targetUser = await anonUser();
      const guestToken = (await anonUser()).token;
      const memberToken = (await userToken("member")).token;
      const moderatorToken = (await userToken("moderator")).token;

      for (const token of [guestToken, memberToken, moderatorToken]) {
        const response = await app.inject({
          method: "PATCH",
          url: `/api/v1/users/${targetUser.id}`,
          headers: { authorization: `Bearer ${token}` },
          payload: { role: "moderator" },
        });

        expect(response.statusCode).toBe(403);
        expect(response.headers["content-type"]).toContain("application/problem+json");
        expect(response.json().title).toBe("Forbidden");
      }
    });

    it("rejects invalid user id parameter", async () => {
      const admin = await userToken("admin");
      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/users/not-a-uuid`,
        headers: { authorization: `Bearer ${admin.token}` },
        payload: { role: "moderator" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.headers["content-type"]).toContain("application/problem+json");
    });

    it("rejects invalid payload or empty payload", async () => {
      const admin = await userToken("admin");
      const target = await anonUser();

      const resInvalidRole = await app.inject({
        method: "PATCH",
        url: `/api/v1/users/${target.id}`,
        headers: { authorization: `Bearer ${admin.token}` },
        payload: { role: "superadmin" },
      });
      expect(resInvalidRole.statusCode).toBe(400);

      const resEmpty = await app.inject({
        method: "PATCH",
        url: `/api/v1/users/${target.id}`,
        headers: { authorization: `Bearer ${admin.token}` },
        payload: {},
      });
      expect(resEmpty.statusCode).toBe(400);
    });

    it("returns 404 for unknown user", async () => {
      const admin = await userToken("admin");
      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/users/123e4567-e89b-12d3-a456-426614174000`,
        headers: { authorization: `Bearer ${admin.token}` },
        payload: { role: "moderator" },
      });

      expect(response.statusCode).toBe(404);
      expect(response.headers["content-type"]).toContain("application/problem+json");
    });

    it("admin can promote and demote a user's role", async () => {
      const admin = await userToken("admin");
      const target = await anonUser();

      // Promote guest to moderator
      const promoteRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/users/${target.id}`,
        headers: { authorization: `Bearer ${admin.token}` },
        payload: { role: "moderator" },
      });

      expect(promoteRes.statusCode).toBe(200);
      const promotedUser = promoteRes.json();
      expect(promotedUser.id).toBe(target.id);
      expect(promotedUser.role).toBe("moderator");
      expect(UserSchema.safeParse(promotedUser).success).toBe(true);

      // Verify observable state via /auth/me with new token or direct check
      const checkRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { authorization: `Bearer ${target.token}` },
      });
      // Note: /auth/me checks DB by token subject (userId), so role in DB is updated
      expect(checkRes.statusCode).toBe(200);
      expect(checkRes.json().role).toBe("moderator");

      // Promote to admin
      const adminRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/users/${target.id}`,
        headers: { authorization: `Bearer ${admin.token}` },
        payload: { role: "admin" },
      });
      expect(adminRes.statusCode).toBe(200);
      expect(adminRes.json().role).toBe("admin");

      // Demote to member
      const demoteRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/users/${target.id}`,
        headers: { authorization: `Bearer ${admin.token}` },
        payload: { role: "member" },
      });
      expect(demoteRes.statusCode).toBe(200);
      expect(demoteRes.json().role).toBe("member");
    });
  });
});
