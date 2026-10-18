import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import {
  createMemDb,
  Database,
  flairs,
  identities,
  userFlairs,
  users,
} from "@koe/db";
import { eq } from "drizzle-orm";
import {
  ServiceFlairAssignmentResponseSchema,
  ServiceIdentityResponseSchema,
  UserRole,
} from "@koe/core";
import { signAccessToken } from "@koe/auth";
import { FastifyInstance } from "fastify";

interface SessionCookies {
  session: string;
  csrf: string;
}

const serviceToken = "test-service-token-at-least-32-characters";
const unknownUser = "123e4567-e89b-12d3-a456-426614174000";

const gold = {
  slug: "gold-supporter",
  label: "Gold",
  colour: "#d4af37",
  rank: 30,
};
const bronze = {
  slug: "bronze-supporter",
  label: "Bronze",
  colour: "#cd7f32",
  rank: 20,
};

describe("Service API", () => {
  let app: FastifyInstance;
  let memDb: Database;
  const jwtSecret = "test-jwt-secret-at-least-32-chars-long";

  beforeEach(async () => {
    const { db } = await createMemDb();
    memDb = db;
    app = buildApp({ db, jwtSecret, serviceToken, logger: false });
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
    return {
      session: cookieValue(response.cookies, "koe_admin_session")!,
      csrf: cookieValue(response.cookies, "koe_csrf")!,
    };
  }

  async function createFlair(
    cookies: SessionCookies,
    body: Record<string, unknown>
  ) {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/admin/flairs",
      cookies: { koe_admin_session: cookies.session, koe_csrf: cookies.csrf },
      headers: { "x-csrf-token": cookies.csrf },
      payload: body,
    });
    expect(response.statusCode).toBe(201);
    return response.json();
  }

  async function assign(
    userId: string,
    slugs: string[],
    token: string | null = serviceToken
  ) {
    return app.inject({
      method: "PUT",
      url: `/api/v1/service/users/${userId}/flairs`,
      headers: token ? { authorization: `Bearer ${token}` } : {},
      payload: { slugs },
    });
  }

  async function heldSlugs(userId: string): Promise<string[]> {
    const rows = await memDb
      .select({ slug: flairs.slug })
      .from(userFlairs)
      .innerJoin(flairs, eq(userFlairs.flairId, flairs.id))
      .where(eq(userFlairs.userId, userId));
    return rows.map((row: { slug: string }) => row.slug).sort();
  }

  describe("service credential", () => {
    it("rejects a missing credential with 401 Problem Details", async () => {
      const { id } = await anonUser();

      const assignResponse = await assign(id, [gold.slug], null);
      expect(assignResponse.statusCode).toBe(401);
      expect(assignResponse.headers["content-type"]).toContain(
        "application/problem+json"
      );

      const identityResponse = await app.inject({
        method: "GET",
        url: "/api/v1/service/identities?provider=discord&providerUserId=1",
      });
      expect(identityResponse.statusCode).toBe(401);
      expect(identityResponse.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("rejects an incorrect credential with 401", async () => {
      const { id } = await anonUser();
      const response = await assign(id, [gold.slug], "not-the-service-token");
      expect(response.statusCode).toBe(401);
    });

    it("does not grant access to an unrelated admin route", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/admin/users",
        headers: { authorization: `Bearer ${serviceToken}` },
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("cannot moderate or ban with the service credential", async () => {
      const { id } = await anonUser();
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/moderation/actions",
        headers: { authorization: `Bearer ${serviceToken}` },
        payload: { targetType: "user", targetId: id, action: "ban" },
      });

      expect(response.statusCode).toBe(401);
    });

    it("does not grant access to the public bearer-authenticated API", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { authorization: `Bearer ${serviceToken}` },
      });

      expect(response.statusCode).toBe(401);
    });

    it("rejects an admin session cookie on a service route", async () => {
      const admin = await login("admin");
      const { id } = await anonUser();

      const response = await app.inject({
        method: "PUT",
        url: `/api/v1/service/users/${id}/flairs`,
        cookies: {
          koe_admin_session: admin.session,
          koe_csrf: admin.csrf,
        },
        payload: { slugs: [] },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("PUT /api/v1/service/users/:id/flairs", () => {
    it("replaces the held set with the requested slugs", async () => {
      const admin = await login("admin");
      await createFlair(admin, gold);
      await createFlair(admin, bronze);
      const { id } = await anonUser();

      const response = await assign(id, [gold.slug, bronze.slug]);

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(ServiceFlairAssignmentResponseSchema.safeParse(body).success).toBe(
        true
      );
      expect(body).toEqual({
        applied: [gold.slug, bronze.slug],
        unknownSlugs: [],
      });
      expect(await heldSlugs(id)).toEqual([bronze.slug, gold.slug]);
    });

    it("replaces the whole set, so an omitted slug is released", async () => {
      const admin = await login("admin");
      await createFlair(admin, gold);
      await createFlair(admin, bronze);
      const { id } = await anonUser();

      await assign(id, [gold.slug, bronze.slug]);
      const response = await assign(id, [bronze.slug]);

      expect(response.statusCode).toBe(200);
      expect(response.json().applied).toEqual([bronze.slug]);
      expect(await heldSlugs(id)).toEqual([bronze.slug]);
    });

    it("releases everything when given an empty array", async () => {
      const admin = await login("admin");
      await createFlair(admin, gold);
      const { id } = await anonUser();

      await assign(id, [gold.slug]);
      const response = await assign(id, []);

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ applied: [], unknownSlugs: [] });
      expect(await heldSlugs(id)).toEqual([]);
    });

    it("changes nothing when an identical call is replayed", async () => {
      const admin = await login("admin");
      await createFlair(admin, gold);
      const { id } = await anonUser();

      await assign(id, [gold.slug]);
      const [before] = await memDb
        .select()
        .from(userFlairs)
        .where(eq(userFlairs.userId, id));

      const replay = await assign(id, [gold.slug]);

      expect(replay.statusCode).toBe(200);
      expect(replay.json().applied).toEqual([gold.slug]);

      const rows = await memDb
        .select()
        .from(userFlairs)
        .where(eq(userFlairs.userId, id));
      expect(rows).toHaveLength(1);
      expect(rows[0].createdAt).toEqual(before.createdAt);
      expect(rows[0].id).toBe(before.id);
    });

    it("reports an unknown slug without creating it", async () => {
      const admin = await login("admin");
      await createFlair(admin, gold);
      const { id } = await anonUser();

      const response = await assign(id, [gold.slug, "not-a-flair"]);

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        applied: [gold.slug],
        unknownSlugs: ["not-a-flair"],
      });
      expect(await heldSlugs(id)).toEqual([gold.slug]);

      const definitions = await app.inject({
        method: "GET",
        url: "/api/v1/flairs",
      });
      expect(
        definitions
          .json()
          .flairs.map((flair: { slug: string }) => flair.slug)
      ).toEqual([gold.slug]);
    });

    it("treats the body as a set, ignoring duplicate slugs", async () => {
      const admin = await login("admin");
      await createFlair(admin, gold);
      const { id } = await anonUser();

      const response = await assign(id, [gold.slug, gold.slug]);

      expect(response.statusCode).toBe(200);
      expect(response.json().applied).toEqual([gold.slug]);
      expect(await heldSlugs(id)).toEqual([gold.slug]);
    });

    it("applies whole-set semantics when no requested slug is known", async () => {
      const admin = await login("admin");
      await createFlair(admin, gold);
      const { id } = await anonUser();
      await assign(id, [gold.slug]);

      // Absence means release: the body is the whole set, so a set with only
      // unknown slugs resolves to an empty set rather than preserving holdings.
      const response = await assign(id, ["ghost-flair"]);

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        applied: [],
        unknownSlugs: ["ghost-flair"],
      });
      expect(await heldSlugs(id)).toEqual([]);
    });

    it("returns 404 for a user that does not exist", async () => {
      const admin = await login("admin");
      await createFlair(admin, gold);

      const response = await assign(unknownUser, [gold.slug]);

      expect(response.statusCode).toBe(404);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("rejects an invalid user id with 400", async () => {
      const response = await assign("not-a-uuid", [gold.slug]);
      expect(response.statusCode).toBe(400);
    });

    it("rejects an invalid body with 422", async () => {
      const { id } = await anonUser();

      const notAnArray = await app.inject({
        method: "PUT",
        url: `/api/v1/service/users/${id}/flairs`,
        headers: { authorization: `Bearer ${serviceToken}` },
        payload: { slugs: "gold-supporter" },
      });
      expect(notAnArray.statusCode).toBe(422);

      const malformedSlug = await assign(id, ["Gold Supporter"]);
      expect(malformedSlug.statusCode).toBe(422);
    });
  });

  describe("GET /api/v1/service/identities", () => {
    it("resolves a provider identity to its owning user", async () => {
      const { id } = await anonUser();
      await memDb.insert(identities).values({
        userId: id,
        provider: "discord",
        providerUserId: "987654321",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/service/identities?provider=discord&providerUserId=987654321",
        headers: { authorization: `Bearer ${serviceToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(ServiceIdentityResponseSchema.safeParse(body).success).toBe(true);
      expect(body).toEqual({ userId: id });
    });

    it("returns 404 for an identity that does not exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/service/identities?provider=discord&providerUserId=nobody",
        headers: { authorization: `Bearer ${serviceToken}` },
      });

      expect(response.statusCode).toBe(404);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json"
      );
    });

    it("rejects an invalid query with 400", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/service/identities?provider=nope",
        headers: { authorization: `Bearer ${serviceToken}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
