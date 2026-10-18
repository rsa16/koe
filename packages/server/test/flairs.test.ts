import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb, Database, userFlairs, users } from "@koe/db";
import { eq } from "drizzle-orm";
import { FlairListResponseSchema, FlairSchema, UserRole } from "@koe/core";
import { signAccessToken } from "@koe/auth";
import { FastifyInstance } from "fastify";

interface SessionCookies {
  session: string;
  csrf: string;
}

const goldenFlair = {
  slug: "gold-supporter",
  label: "Gold",
  colour: "#d4af37",
  rank: 30,
};

describe("Flair definitions API", () => {
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
    return signAccessToken(
      { userId: id, role },
      { secret: jwtSecret, expiresIn: "15m" }
    );
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

  async function createFlair(
    cookies: SessionCookies,
    body: Record<string, unknown> = goldenFlair
  ) {
    return app.inject({
      method: "POST",
      url: "/api/v1/admin/flairs",
      cookies: { koe_admin_session: cookies.session, koe_csrf: cookies.csrf },
      headers: { "x-csrf-token": cookies.csrf },
      payload: body,
    });
  }

  async function firstFlairId(): Promise<string> {
    const list = await app.inject({ method: "GET", url: "/api/v1/flairs" });
    return list.json().flairs[0].id;
  }

  describe("GET /api/v1/flairs", () => {
    it("is readable without authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/flairs",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(FlairListResponseSchema.safeParse(body).success).toBe(true);
      expect(body.flairs).toEqual([]);
    });

    it("lists Flairs ordered by rank", async () => {
      const admin = await login("admin");
      await createFlair(admin, { ...goldenFlair, rank: 30, slug: "gold" });
      await createFlair(admin, { ...goldenFlair, rank: 10, slug: "donator" });
      await createFlair(admin, { ...goldenFlair, rank: 20, slug: "bronze" });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/flairs",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().flairs.map((flair: { slug: string }) => flair.slug)).toEqual([
        "donator",
        "bronze",
        "gold",
      ]);
    });
  });

  describe("GET /api/v1/admin/flairs", () => {
    it("requires an admin session", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/flairs",
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("returns the same definitions to an admin", async () => {
      const admin = await login("admin");
      await createFlair(admin);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/flairs",
        cookies: { koe_admin_session: admin.session, koe_csrf: admin.csrf },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().flairs).toHaveLength(1);
    });
  });

  describe("POST /api/v1/admin/flairs", () => {
    it("requires an admin session", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/flairs",
        payload: goldenFlair,
      });

      expect(response.statusCode).toBe(401);
    });

    it("rejects a moderator", async () => {
      const moderator = await login("moderator");
      const response = await createFlair(moderator);

      expect(response.statusCode).toBe(403);
    });

    it("requires a CSRF token", async () => {
      const admin = await login("admin");
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/admin/flairs",
        cookies: { koe_admin_session: admin.session, koe_csrf: admin.csrf },
        payload: goldenFlair,
      });

      expect(response.statusCode).toBe(403);
    });

    it("creates a Flair", async () => {
      const admin = await login("admin");
      const response = await createFlair(admin);

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(FlairSchema.safeParse(body).success).toBe(true);
      expect(body.slug).toBe("gold-supporter");
      expect(body.label).toBe("Gold");
      expect(body.colour).toBe("#d4af37");
      expect(body.rank).toBe(30);

      const list = await app.inject({ method: "GET", url: "/api/v1/flairs" });
      expect(list.json().flairs.map((f: { slug: string }) => f.slug)).toEqual([
        "gold-supporter",
      ]);
    });

    it("rejects a duplicate slug with a 409 Problem Details", async () => {
      const admin = await login("admin");
      await createFlair(admin);

      const response = await createFlair(admin, { ...goldenFlair, label: "Another" });

      expect(response.statusCode).toBe(409);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
      expect(response.json().status).toBe(409);
    });

    it("rejects an invalid slug, label and colour with 422", async () => {
      const admin = await login("admin");

      const badSlug = await createFlair(admin, {
        ...goldenFlair,
        slug: "Gold Supporter",
      });
      expect(badSlug.statusCode).toBe(422);
      expect(badSlug.headers["content-type"]).toContain(
        "application/problem+json"
      );

      const badLabel = await createFlair(admin, { ...goldenFlair, label: "" });
      expect(badLabel.statusCode).toBe(422);

      const badColour = await createFlair(admin, {
        ...goldenFlair,
        colour: "gold",
      });
      expect(badColour.statusCode).toBe(422);

      const notIntegerRank = await createFlair(admin, {
        ...goldenFlair,
        rank: 1.5,
      });
      expect(notIntegerRank.statusCode).toBe(422);
    });
  });

  describe("PATCH /api/v1/admin/flairs/:id", () => {
    it("requires a CSRF token", async () => {
      const admin = await login("admin");
      await createFlair(admin);
      const id = await firstFlairId();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/flairs/${id}`,
        cookies: { koe_admin_session: admin.session, koe_csrf: admin.csrf },
        payload: { label: "Bronze" },
      });

      expect(response.statusCode).toBe(403);
    });

    it("updates the label, colour and rank", async () => {
      const admin = await login("admin");
      await createFlair(admin);
      const id = await firstFlairId();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/flairs/${id}`,
        cookies: { koe_admin_session: admin.session, koe_csrf: admin.csrf },
        headers: { "x-csrf-token": admin.csrf },
        payload: { label: "Gold Tier", colour: "#ffd700", rank: 35 },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(FlairSchema.safeParse(body).success).toBe(true);
      expect(body.label).toBe("Gold Tier");
      expect(body.colour).toBe("#ffd700");
      expect(body.rank).toBe(35);
      expect(body.slug).toBe("gold-supporter");
    });

    it("rejects an invalid update with 422", async () => {
      const admin = await login("admin");
      await createFlair(admin);
      const id = await firstFlairId();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/flairs/${id}`,
        cookies: { koe_admin_session: admin.session, koe_csrf: admin.csrf },
        headers: { "x-csrf-token": admin.csrf },
        payload: { colour: "#zzzzzz" },
      });

      expect(response.statusCode).toBe(422);
    });

    it("rejects an empty update", async () => {
      const admin = await login("admin");
      await createFlair(admin);
      const id = await firstFlairId();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/flairs/${id}`,
        cookies: { koe_admin_session: admin.session, koe_csrf: admin.csrf },
        headers: { "x-csrf-token": admin.csrf },
        payload: {},
      });

      expect(response.statusCode).toBe(422);
    });

    it("returns 404 for an unknown Flair", async () => {
      const admin = await login("admin");
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/admin/flairs/123e4567-e89b-12d3-a456-426614174000",
        cookies: { koe_admin_session: admin.session, koe_csrf: admin.csrf },
        headers: { "x-csrf-token": admin.csrf },
        payload: { label: "Nope" },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("DELETE /api/v1/admin/flairs/:id", () => {
    it("requires a CSRF token", async () => {
      const admin = await login("admin");
      await createFlair(admin);
      const id = await firstFlairId();

      const response = await app.inject({
        method: "DELETE",
        url: `/api/v1/admin/flairs/${id}`,
        cookies: { koe_admin_session: admin.session, koe_csrf: admin.csrf },
      });

      expect(response.statusCode).toBe(403);
    });

    it("deletes a Flair", async () => {
      const admin = await login("admin");
      const created = await createFlair(admin);
      const id = created.json().id;

      const response = await app.inject({
        method: "DELETE",
        url: `/api/v1/admin/flairs/${id}`,
        cookies: { koe_admin_session: admin.session, koe_csrf: admin.csrf },
        headers: { "x-csrf-token": admin.csrf },
      });

      expect(response.statusCode).toBe(204);

      const list = await app.inject({ method: "GET", url: "/api/v1/flairs" });
      expect(list.json().flairs).toEqual([]);
    });

    it("returns 404 for an unknown Flair", async () => {
      const admin = await login("admin");
      const response = await app.inject({
        method: "DELETE",
        url: "/api/v1/admin/flairs/123e4567-e89b-12d3-a456-426614174000",
        cookies: { koe_admin_session: admin.session, koe_csrf: admin.csrf },
        headers: { "x-csrf-token": admin.csrf },
      });

      expect(response.statusCode).toBe(404);
    });

    it("removes a User's holding of a deleted Flair", async () => {
      const admin = await login("admin");
      const created = await createFlair(admin);
      const flairId = created.json().id;

      const holder = await anonUser();
      await memDb.insert(userFlairs).values({ userId: holder.id, flairId });

      // Without ON DELETE CASCADE this delete would fail on the holding's
      // foreign key instead of returning 204.
      const response = await app.inject({
        method: "DELETE",
        url: `/api/v1/admin/flairs/${flairId}`,
        cookies: { koe_admin_session: admin.session, koe_csrf: admin.csrf },
        headers: { "x-csrf-token": admin.csrf },
      });

      expect(response.statusCode).toBe(204);

      const list = await app.inject({ method: "GET", url: "/api/v1/flairs" });
      expect(list.json().flairs).toEqual([]);
    });
  });
});
