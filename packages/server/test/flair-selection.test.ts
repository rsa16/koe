import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb, Database, users } from "@koe/db";
import { eq } from "drizzle-orm";
import {
  CommentListResponse,
  CommentListResponseSchema,
  UserProfile,
  UserProfileSchema,
  UserRole,
} from "@koe/core";
import { signAccessToken } from "@koe/auth";
import { FastifyInstance } from "fastify";

interface SessionCookies {
  session: string;
  csrf: string;
}

interface FlairDefinition {
  id: string;
  slug: string;
  label: string;
  colour: string;
  rank: number;
}

const serviceToken = "test-service-token-at-least-32-characters";

const donator = {
  slug: "donator",
  label: "Donator",
  colour: "#111111",
  rank: 10,
};
const bronze = {
  slug: "bronze-supporter",
  label: "Bronze",
  colour: "#cd7f32",
  rank: 20,
};
const gold = {
  slug: "gold-supporter",
  label: "Gold",
  colour: "#d4af37",
  rank: 30,
};
const platinum = {
  slug: "platinum-supporter",
  label: "Platinum",
  colour: "#e5e4e2",
  rank: 40,
};

describe("Flair Selection", () => {
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
  ): Promise<FlairDefinition> {
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

  async function patchSelection(
    token: string,
    displayedFlairIds: string[]
  ): Promise<{ statusCode: number; body: unknown; contentType: string }> {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${token}` },
      payload: { displayedFlairIds },
    });
    return {
      statusCode: response.statusCode,
      body: response.json(),
      contentType: response.headers["content-type"] ?? "",
    };
  }

  async function profile(token: string): Promise<UserProfile> {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    return UserProfileSchema.parse(response.json());
  }

  async function createThread(ref = "flair-selection-post"): Promise<string> {
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
    return CommentListResponseSchema.parse(response.json());
  }

  it("returns held Flairs and the stored selection with the profile", async () => {
    const admin = await login("admin");
    const goldFlair = await createFlair(admin, gold);
    const bronzeFlair = await createFlair(admin, bronze);

    const { id, token } = await userToken("member");
    await assignFlairs(id, [goldFlair.slug, bronzeFlair.slug]);

    const response = await patchSelection(token, [
      goldFlair.id,
      bronzeFlair.id,
    ]);
    expect(response.statusCode).toBe(200);
    const updated = UserProfileSchema.parse(response.body);
    expect([...updated.displayedFlairIds].sort()).toEqual(
      [goldFlair.id, bronzeFlair.id].sort()
    );
    expect(updated.flairs.map((flair) => flair.slug)).toEqual([
      bronzeFlair.slug,
      goldFlair.slug,
    ]);

    const me = await profile(token);
    expect([...me.displayedFlairIds].sort()).toEqual(
      [goldFlair.id, bronzeFlair.id].sort()
    );
    expect(me.flairs.map((flair) => flair.slug)).toEqual([
      bronzeFlair.slug,
      goldFlair.slug,
    ]);
  });

  it("rejects more than three entries with Problem Details and changes nothing", async () => {
    const admin = await login("admin");
    const definitions = [
      await createFlair(admin, donator),
      await createFlair(admin, bronze),
      await createFlair(admin, gold),
      await createFlair(admin, platinum),
    ];

    const { id, token } = await userToken("member");
    await assignFlairs(
      id,
      definitions.map((flair) => flair.slug)
    );

    const accepted = await patchSelection(token, [definitions[0].id]);
    expect(accepted.statusCode).toBe(200);

    const response = await patchSelection(
      token,
      definitions.map((flair) => flair.id)
    );
    expect(response.statusCode).toBe(422);
    expect(response.contentType).toContain("application/problem+json");

    const me = await profile(token);
    expect(me.displayedFlairIds).toEqual([definitions[0].id]);
  });

  it("rejects a Flair the user does not hold with Problem Details", async () => {
    const admin = await login("admin");
    const goldFlair = await createFlair(admin, gold);
    const platinumFlair = await createFlair(admin, platinum);

    const { id, token } = await userToken("member");
    await assignFlairs(id, [goldFlair.slug]);

    const response = await patchSelection(token, [
      goldFlair.id,
      platinumFlair.id,
    ]);
    expect(response.statusCode).toBe(422);
    expect(response.contentType).toContain("application/problem+json");

    const unheld = await patchSelection(token, [
      "123e4567-e89b-12d3-a456-426614174000",
    ]);
    expect(unheld.statusCode).toBe(422);

    const me = await profile(token);
    expect(me.displayedFlairIds).toEqual([]);
  });

  it("defaults the displayed set to held Supporter Flairs ranked and capped at three", async () => {
    const admin = await login("admin");
    // Create out of rank order to prove rank drives display, not insertion.
    const platinumFlair = await createFlair(admin, platinum);
    await createFlair(admin, donator);
    await createFlair(admin, gold);
    await createFlair(admin, bronze);

    const { id, token } = await userToken("member");
    await assignFlairs(id, [
      platinumFlair.slug,
      donator.slug,
      gold.slug,
      bronze.slug,
    ]);

    const beforeChoosing = await profile(token);
    expect(beforeChoosing.displayedFlairIds).toEqual([]);
    expect(beforeChoosing.flairs.map((flair) => flair.slug)).toEqual([
      donator.slug,
      bronze.slug,
      gold.slug,
      platinum.slug,
    ]);

    const threadId = await createThread();
    await postComment(threadId, token, "Everything I hold, ranked");

    const body = await listComments(threadId);
    expect(
      body.comments[0].authorFlairs.map((flair) => flair.slug)
    ).toEqual([donator.slug, bronze.slug, gold.slug]);
  });

  it("displays the selected set in rank order, never request order", async () => {
    const admin = await login("admin");
    const goldFlair = await createFlair(admin, gold);
    const bronzeFlair = await createFlair(admin, bronze);
    const platinumFlair = await createFlair(admin, platinum);

    const { id, token } = await userToken("member");
    await assignFlairs(id, [
      goldFlair.slug,
      bronzeFlair.slug,
      platinumFlair.slug,
    ]);

    const response = await patchSelection(token, [
      platinumFlair.id,
      goldFlair.id,
      bronzeFlair.id,
    ]);
    expect(response.statusCode).toBe(200);

    const threadId = await createThread();
    await postComment(threadId, token, "My chosen Flairs");

    const body = await listComments(threadId);
    expect(
      body.comments[0].authorFlairs.map((flair) => flair.slug)
    ).toEqual([bronzeFlair.slug, goldFlair.slug, platinumFlair.slug]);
  });

  it("stops displaying a Flair once it is released, without changing the selection", async () => {
    const admin = await login("admin");
    const goldFlair = await createFlair(admin, gold);
    const bronzeFlair = await createFlair(admin, bronze);
    const platinumFlair = await createFlair(admin, platinum);

    const { id, token } = await userToken("member");
    await assignFlairs(id, [
      goldFlair.slug,
      bronzeFlair.slug,
      platinumFlair.slug,
    ]);
    const response = await patchSelection(token, [
      goldFlair.id,
      bronzeFlair.id,
      platinumFlair.id,
    ]);
    expect(response.statusCode).toBe(200);

    const threadId = await createThread();
    await postComment(threadId, token, "Before the release");
    expect(
      (await listComments(threadId)).comments[0].authorFlairs.map(
        (flair) => flair.slug
      )
    ).toEqual([bronzeFlair.slug, goldFlair.slug, platinumFlair.slug]);

    // The external service releases Gold; the User's selection is untouched.
    await assignFlairs(id, [bronzeFlair.slug, platinumFlair.slug]);

    expect(
      (await listComments(threadId)).comments[0].authorFlairs.map(
        (flair) => flair.slug
      )
    ).toEqual([bronzeFlair.slug, platinumFlair.slug]);

    const me = await profile(token);
    expect([...me.displayedFlairIds].sort()).toEqual(
      [goldFlair.id, bronzeFlair.id, platinumFlair.id].sort()
    );
  });

  it("always displays a Staff Flair first without counting it towards the three", async () => {
    const admin = await login("admin");
    const goldFlair = await createFlair(admin, gold);
    const donatorFlair = await createFlair(admin, donator);
    const bronzeFlair = await createFlair(admin, bronze);
    const platinumFlair = await createFlair(admin, platinum);

    const { id, token } = await userToken("moderator");
    await assignFlairs(id, [
      goldFlair.slug,
      donatorFlair.slug,
      bronzeFlair.slug,
      platinumFlair.slug,
    ]);

    const threadId = await createThread();
    await postComment(threadId, token, "A moderator with four Flairs");

    const body = await listComments(threadId);
    expect(body.comments[0].authorFlairs).toEqual([
      { slug: "moderator", label: "Moderator", colour: null, rank: -100, staff: true },
      { ...donator, staff: false },
      { ...bronze, staff: false },
      { ...gold, staff: false },
    ]);

    // A selection of three Supporter Flairs still leaves the Staff Flair shown.
    const response = await patchSelection(token, [
      goldFlair.id,
      platinumFlair.id,
      bronzeFlair.id,
    ]);
    expect(response.statusCode).toBe(200);

    const afterSelection = await listComments(threadId);
    expect(
      afterSelection.comments[0].authorFlairs.map((flair) => flair.slug)
    ).toEqual(["moderator", bronze.slug, gold.slug, platinum.slug]);
  });
});
