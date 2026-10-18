import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb, Database, users } from "@koe/db";
import { eq } from "drizzle-orm";
import {
  CommentListResponse,
  CommentListResponseSchema,
  FlairListResponseSchema,
  UserRole,
} from "@koe/core";
import { signAccessToken } from "@koe/auth";
import { FastifyInstance } from "fastify";

interface SessionCookies {
  session: string;
  csrf: string;
}

const serviceToken = "test-service-token-at-least-32-characters";

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

describe("Flairs on the comment payload", () => {
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

  function cookieValue(
    cookies: Array<{ name: string; value: string }> | undefined,
    name: string
  ): string | undefined {
    return cookies?.find((cookie) => cookie.name === name)?.value;
  }

  async function anonUser(): Promise<{ id: string; token: string }> {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/anonymous",
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    return { id: body.user.id, token: body.accessToken };
  }

  async function userToken(role: UserRole): Promise<{
    id: string;
    token: string;
  }> {
    const { id } = await anonUser();
    if (role !== "guest") {
      await memDb.update(users).set({ role }).where(eq(users.id, id));
    }
    const token = await signAccessToken(
      { userId: id, role },
      { secret: jwtSecret, expiresIn: "15m" }
    );
    return { id, token };
  }

  async function login(role: UserRole): Promise<SessionCookies> {
    const { token } = await userToken(role);
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
  ): Promise<Record<string, unknown>> {
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

  async function assignFlairs(userId: string, slugs: string[]): Promise<void> {
    const response = await app.inject({
      method: "PUT",
      url: `/api/v1/service/users/${userId}/flairs`,
      headers: { authorization: `Bearer ${serviceToken}` },
      payload: { slugs },
    });
    expect(response.statusCode).toBe(200);
  }

  async function createThread(ref = "flair-post"): Promise<string> {
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

  async function listComments(threadId: string): Promise<CommentListResponse> {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/threads/${threadId}/comments`,
    });
    expect(response.statusCode).toBe(200);
    // Proves the public contract carries authorFlairs.
    return CommentListResponseSchema.parse(response.json());
  }

  it("renders no Flairs for an author who holds nothing", async () => {
    const threadId = await createThread();
    const { token } = await userToken("member");
    await postComment(threadId, token, "Just a member");

    const body = await listComments(threadId);
    expect(body.comments[0].authorFlairs).toEqual([]);
  });

  it("carries every held Flair for the author, ordered by rank", async () => {
    const threadId = await createThread();
    const admin = await login("admin");
    await createFlair(admin, gold);
    await createFlair(admin, bronze);

    const { id, token } = await userToken("member");
    await postComment(threadId, token, "A supporter");
    await assignFlairs(id, [gold.slug, bronze.slug]);

    const body = await listComments(threadId);
    expect(body.comments[0].authorFlairs).toEqual([
      { ...bronze, staff: false },
      { ...gold, staff: false },
    ]);
  });

  it("renders a Staff Flair first and always, ahead of Supporter Flairs", async () => {
    const threadId = await createThread();
    const admin = await login("admin");
    await createFlair(admin, gold);

    const { id, token } = await userToken("moderator");
    await postComment(threadId, token, "A moderator supporter");
    await assignFlairs(id, [gold.slug]);

    const body = await listComments(threadId);
    expect(body.comments[0].authorFlairs).toEqual([
      { slug: "moderator", label: "Moderator", colour: null, rank: -100, staff: true },
      { ...gold, staff: false },
    ]);
  });

  it("gives an admin the Admin Staff Flair even with no holdings", async () => {
    const threadId = await createThread();
    const { token } = await userToken("admin");
    await postComment(threadId, token, "An admin");

    const body = await listComments(threadId);
    expect(body.comments[0].authorFlairs).toEqual([
      { slug: "admin", label: "Admin", colour: null, rank: -200, staff: true },
    ]);
  });

  it("stops carrying a Flair once its definition is deleted", async () => {
    const threadId = await createThread();
    const admin = await login("admin");
    const definition = (await createFlair(admin, gold)) as { id: string };

    const { id, token } = await userToken("member");
    await postComment(threadId, token, "A lapsed supporter");
    await assignFlairs(id, [gold.slug]);
    expect((await listComments(threadId)).comments[0].authorFlairs).toHaveLength(
      1
    );

    const del = await app.inject({
      method: "DELETE",
      url: `/api/v1/admin/flairs/${definition.id}`,
      cookies: { koe_admin_session: admin.session, koe_csrf: admin.csrf },
      headers: { "x-csrf-token": admin.csrf },
    });
    expect(del.statusCode).toBe(204);

    expect((await listComments(threadId)).comments[0].authorFlairs).toEqual([]);
  });

  it("exposes definitions publicly, so labels are resolvable without auth", async () => {
    const admin = await login("admin");
    await createFlair(admin, gold);

    const response = await app.inject({ method: "GET", url: "/api/v1/flairs" });
    expect(response.statusCode).toBe(200);
    const body = FlairListResponseSchema.parse(response.json());
    expect(body.flairs.map((flair) => flair.slug)).toContain(gold.slug);
  });
});
