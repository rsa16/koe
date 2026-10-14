import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb, Database, networkBlocks, users } from "@koe/db";
import { eq } from "drizzle-orm";
import { signAccessToken } from "@koe/auth";
import { AdminNetworkBlockListResponseSchema, UserRole } from "@koe/core";
import { FastifyInstance } from "fastify";
import { parseTrustProxy } from "../src/trust-proxy.js";

const jwtSecret = "test-jwt-secret-at-least-32-chars-long";
const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * DAY_MS;
const BLOCKED_IP = "8.8.8.8";
const EXPIRED_IP = "203.0.113.9";
const ACTIVE_IP = "198.51.100.4";
const UNKNOWN_BLOCK_ID = "123e4567-e89b-12d3-a456-426614174000";

describe("Admin Network Blocks API Seam Integration Tests", () => {
  let app: FastifyInstance;
  let memDb: Database;
  let founderId: string;

  beforeEach(async () => {
    const { db } = await createMemDb();
    memDb = db;
    app = buildApp({
      db,
      jwtSecret,
      logger: false,
      preModerationDefault: false,
      trustProxy: parseTrustProxy("127.0.0.1"),
      networkAddresses: { enabled: true, retentionMs: YEAR_MS },
    });
    await app.ready();
    const [founder] = await memDb
      .insert(users)
      .values({ role: "admin" })
      .returning();
    founderId = founder.id as string;
  });

  afterEach(async () => {
    await app.close();
  });

  async function anonUser(
    forwardedFor?: string
  ): Promise<{ id: string; token: string }> {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/anonymous",
      headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : {},
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    return { id: body.user.id as string, token: body.accessToken as string };
  }

  async function roleUser(
    role: UserRole,
    forwardedFor?: string
  ): Promise<{ id: string; token: string }> {
    const { id } = await anonUser(forwardedFor);
    await memDb.update(users).set({ role }).where(eq(users.id, id));
    const token = await signAccessToken(
      { userId: id, role },
      { secret: jwtSecret, expiresIn: "15m" }
    );
    return { id, token };
  }

  async function setName(userId: string, name: string): Promise<void> {
    await memDb.update(users).set({ name }).where(eq(users.id, userId));
  }

  async function createThread(ref: string): Promise<string> {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/threads/by-ref/${encodeURIComponent(ref)}`,
    });
    expect(response.statusCode).toBe(200);
    return response.json().id as string;
  }

  function interact(
    token: string,
    forwardedFor: string,
    method: "POST" | "DELETE",
    url: string,
    payload?: Record<string, unknown>
  ) {
    return app.inject({
      method,
      url,
      headers: {
        authorization: `Bearer ${token}`,
        "x-forwarded-for": forwardedFor,
      },
      ...(payload ? { payload } : {}),
    });
  }

  function cookieValue(
    cookies: Array<{ name: string; value: string }> | undefined,
    name: string
  ): string | undefined {
    return cookies?.find((cookie) => cookie.name === name)?.value;
  }

  async function login(
    token: string
  ): Promise<{ session: string; csrf: string }> {
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

  async function adminSession(): Promise<{
    id: string;
    token: string;
    session: string;
    csrf: string;
  }> {
    const admin = await roleUser("admin");
    await setName(admin.id, "Admin Ada");
    const { session, csrf } = await login(admin.token);
    return { ...admin, session, csrf };
  }

  async function ban(adminToken: string, userId: string) {
    return app.inject({
      method: "POST",
      url: "/api/v1/moderation/actions",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { userId, action: "ban" },
    });
  }

  it("requires a session cookie on both endpoints", async () => {
    const list = await app.inject({
      method: "GET",
      url: "/api/v1/admin/network-blocks",
    });
    expect(list.statusCode).toBe(401);
    expect(list.headers["content-type"]).toContain(
      "application/problem+json"
    );

    const revoke = await app.inject({
      method: "DELETE",
      url: `/api/v1/admin/network-blocks/${UNKNOWN_BLOCK_ID}`,
    });
    expect(revoke.statusCode).toBe(401);
  });

  it("restricts both endpoints to admins, rejecting moderators", async () => {
    const moderator = await roleUser("moderator");
    const { session, csrf } = await login(moderator.token);
    const cookies = { koe_admin_session: session, koe_csrf: csrf };

    const list = await app.inject({
      method: "GET",
      url: "/api/v1/admin/network-blocks",
      cookies,
    });
    expect(list.statusCode).toBe(403);

    const revoke = await app.inject({
      method: "DELETE",
      url: `/api/v1/admin/network-blocks/${UNKNOWN_BLOCK_ID}`,
      cookies,
      headers: { "x-csrf-token": csrf },
    });
    expect(revoke.statusCode).toBe(403);
  });

  it("lists an active block with its address, source, creator, expiry, and banned User", async () => {
    const admin = await adminSession();
    const victim = await anonUser(BLOCKED_IP);
    await setName(victim.id, "Bad Actor");
    const threadId = await createThread("admin-blocks-list");
    const comment = await interact(
      victim.token,
      BLOCKED_IP,
      "POST",
      `/api/v1/threads/${threadId}/comments`,
      { bodyMd: "abuse" }
    );
    expect(comment.statusCode).toBe(201);
    expect((await ban(admin.token, victim.id)).statusCode).toBe(200);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/admin/network-blocks",
      cookies: { koe_admin_session: admin.session, koe_csrf: admin.csrf },
    });

    expect(response.statusCode).toBe(200);
    expect(
      AdminNetworkBlockListResponseSchema.safeParse(response.json()).success
    ).toBe(true);

    const blocks = response.json().blocks;
    expect(blocks).toHaveLength(1);
    const [block] = blocks;
    expect(block.ip).toBe(BLOCKED_IP);
    expect(block.source).toBe("auto");
    expect(block.reason).toBeTruthy();
    expect(block.createdByName).toBe("Admin Ada");
    expect(block.bannedUserId).toBe(victim.id);
    expect(block.bannedUserName).toBe("Bad Actor");
    expect(new Date(block.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("lists one block per address when a re-ban refreshes it, naming the latest banned User", async () => {
    const admin = await adminSession();
    const cookies = { koe_admin_session: admin.session, koe_csrf: admin.csrf };
    const threadId = await createThread("admin-blocks-refresh");

    const first = await anonUser(BLOCKED_IP);
    await setName(first.id, "First Offender");
    const firstComment = await interact(
      first.token,
      BLOCKED_IP,
      "POST",
      `/api/v1/threads/${threadId}/comments`,
      { bodyMd: "one" }
    );
    expect(firstComment.statusCode).toBe(201);
    expect((await ban(admin.token, first.id)).statusCode).toBe(200);

    // The address is blocked now, so the second User's address is only
    // captured on their anonymous bootstrap; banning them still refreshes it.
    const second = await anonUser(BLOCKED_IP);
    await setName(second.id, "Second Offender");
    expect((await ban(admin.token, second.id)).statusCode).toBe(200);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/admin/network-blocks",
      cookies,
    });

    expect(response.statusCode).toBe(200);
    const blocks = response.json().blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0].ip).toBe(BLOCKED_IP);
    expect(blocks[0].bannedUserId).toBe(second.id);
    expect(blocks[0].bannedUserName).toBe("Second Offender");
  });

  it("lists only active blocks", async () => {
    const admin = await adminSession();
    await memDb.insert(networkBlocks).values([
      {
        ip: EXPIRED_IP,
        reason: "expired",
        source: "auto",
        createdBy: founderId,
        expiresAt: new Date(Date.now() - 1000),
      },
      {
        ip: ACTIVE_IP,
        reason: "active",
        source: "auto",
        createdBy: founderId,
        expiresAt: new Date(Date.now() + DAY_MS),
      },
    ]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/admin/network-blocks",
      cookies: { koe_admin_session: admin.session, koe_csrf: admin.csrf },
    });

    expect(response.statusCode).toBe(200);
    const ips = response.json().blocks.map((block: { ip: string }) => block.ip);
    expect(ips).toContain(ACTIVE_IP);
    expect(ips).not.toContain(EXPIRED_IP);
  });

  it("revokes a block so the address can interact again", async () => {
    const admin = await adminSession();
    const cookies = { koe_admin_session: admin.session, koe_csrf: admin.csrf };
    const threadId = await createThread("admin-revoke-block");

    const victim = await anonUser(BLOCKED_IP);
    const comment = await interact(
      victim.token,
      BLOCKED_IP,
      "POST",
      `/api/v1/threads/${threadId}/comments`,
      { bodyMd: "abuse" }
    );
    expect(comment.statusCode).toBe(201);
    expect((await ban(admin.token, victim.id)).statusCode).toBe(200);

    const blocked = await interact(
      (await anonUser(BLOCKED_IP)).token,
      BLOCKED_IP,
      "POST",
      `/api/v1/threads/${threadId}/comments`,
      { bodyMd: "still blocked" }
    );
    expect(blocked.statusCode).toBe(403);

    const list = await app.inject({
      method: "GET",
      url: "/api/v1/admin/network-blocks",
      cookies,
    });
    const block = list
      .json()
      .blocks.find((item: { ip: string }) => item.ip === BLOCKED_IP);
    expect(block).toBeTruthy();

    const revoke = await app.inject({
      method: "DELETE",
      url: `/api/v1/admin/network-blocks/${block.id}`,
      cookies,
      headers: { "x-csrf-token": admin.csrf },
    });
    expect(revoke.statusCode).toBe(204);

    const after = await interact(
      (await anonUser(BLOCKED_IP)).token,
      BLOCKED_IP,
      "POST",
      `/api/v1/threads/${threadId}/comments`,
      { bodyMd: "allowed again" }
    );
    expect(after.statusCode).toBe(201);
  });

  it("requires a CSRF header to revoke", async () => {
    const admin = await adminSession();
    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/admin/network-blocks/${UNKNOWN_BLOCK_ID}`,
      cookies: { koe_admin_session: admin.session, koe_csrf: admin.csrf },
    });
    expect(response.statusCode).toBe(403);
  });

  it("returns 404 when revoking a Network Block that does not exist", async () => {
    const admin = await adminSession();
    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/admin/network-blocks/${UNKNOWN_BLOCK_ID}`,
      cookies: { koe_admin_session: admin.session, koe_csrf: admin.csrf },
      headers: { "x-csrf-token": admin.csrf },
    });
    expect(response.statusCode).toBe(404);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json"
    );
  });

  it("returns 400 when revoking with a malformed ID", async () => {
    const admin = await adminSession();
    const response = await app.inject({
      method: "DELETE",
      url: "/api/v1/admin/network-blocks/not-a-uuid",
      cookies: { koe_admin_session: admin.session, koe_csrf: admin.csrf },
      headers: { "x-csrf-token": admin.csrf },
    });
    expect(response.statusCode).toBe(400);
  });
});
