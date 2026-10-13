import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb, Database, users } from "@koe/db";
import { eq } from "drizzle-orm";
import { signAccessToken } from "@koe/auth";
import { DomainEvent, NetworkBlock, NetworkBlockSchema, UserRole } from "@koe/core";
import { FastifyInstance } from "fastify";
import { parseTrustProxy } from "../src/trust-proxy.js";

const jwtSecret = "test-jwt-secret-at-least-32-chars-long";
const webhookSecret = "network-block-webhook-secret";
const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * DAY_MS;

interface SessionCookies {
  session: string;
  csrf: string;
}

describe("Network Blocks API Seam Integration Tests", () => {
  let app: FastifyInstance;
  let memDb: Database;
  let deliveries: DomainEvent[];

  beforeEach(async () => {
    const { db } = await createMemDb();
    memDb = db;
    deliveries = [];
    app = buildApp({
      db,
      jwtSecret,
      logger: false,
      preModerationDefault: true,
      trustProxy: parseTrustProxy("127.0.0.1"),
      networkAddresses: { enabled: true, retentionMs: YEAR_MS },
      webhookSubscriptions: [
        {
          url: "http://network-blocks.test/hook",
          secret: webhookSecret,
          events: ["user.network_blocked"],
          active: true,
        },
      ],
      fetchImpl: async (_url, init) => {
        deliveries.push(JSON.parse(init.body) as DomainEvent);
        return { ok: true, status: 204 };
      },
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  /** Flushes pending webhook deliveries and returns the blocks delivered since the last read. */
  async function deliveredBlocks(): Promise<NetworkBlock[]> {
    await app.webhooks.flush();
    const blocks = deliveries
      .filter((event) => event.type === "user.network_blocked")
      .map((event) => NetworkBlockSchema.parse(event.data.block));
    deliveries.length = 0;
    return blocks;
  }

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
    role: UserRole
  ): Promise<{ id: string; token: string }> {
    const { id } = await anonUser();
    await memDb.update(users).set({ role }).where(eq(users.id, id));
    const token = await signAccessToken(
      { userId: id, role },
      { secret: jwtSecret, expiresIn: "15m" }
    );
    return { id, token };
  }

  async function adminSession(): Promise<SessionCookies> {
    const { token } = await roleUser("admin");
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/admin/session",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    const cookie = (name: string) =>
      response.cookies.find((entry) => entry.name === name)!.value;
    return {
      session: cookie("koe_admin_session"),
      csrf: cookie("koe_csrf"),
    };
  }

  async function createThread(ref: string): Promise<string> {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/threads/by-ref/${encodeURIComponent(ref)}`,
    });
    expect(response.statusCode).toBe(200);
    return response.json().id as string;
  }

  async function commentFrom(
    threadId: string,
    token: string,
    forwardedFor: string
  ): Promise<void> {
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/comments`,
      headers: {
        authorization: `Bearer ${token}`,
        "x-forwarded-for": forwardedFor,
      },
      payload: { bodyMd: `from ${forwardedFor}` },
    });
    expect(response.statusCode).toBe(201);
  }

  function moderate(token: string, payload: Record<string, unknown>) {
    return app.inject({
      method: "POST",
      url: "/api/v1/moderation/actions",
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
  }

  function patchAdminUser(
    admin: SessionCookies,
    userId: string,
    payload: { role?: UserRole; status?: string }
  ) {
    return app.inject({
      method: "PATCH",
      url: `/api/v1/admin/users/${userId}`,
      cookies: { koe_admin_session: admin.session, koe_csrf: admin.csrf },
      headers: { "x-csrf-token": admin.csrf },
      payload,
    });
  }

  async function blockAuditEntries(token: string) {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/moderation/actions",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    return response.json().actions as Array<{
      action: string;
      targetType: string;
      targetId: string;
      actorId: string;
      metadata: { ip?: string };
    }>;
  }

  it("creates a Network Block for every captured address when an admin bans a User", async () => {
    const admin = await roleUser("admin");
    const victim = await anonUser("9.9.9.9");
    const threadId = await createThread("ban-blocks");
    await commentFrom(threadId, victim.token, "8.8.8.8");

    const response = await moderate(admin.token, {
      userId: victim.id,
      action: "ban",
    });
    expect(response.statusCode).toBe(200);

    const blocks = await deliveredBlocks();
    expect(blocks.map((block) => block.ip).sort()).toEqual([
      "8.8.8.8",
      "9.9.9.9",
    ]);
    for (const block of blocks) {
      expect(block.source).toBe("auto");
      expect(block.reason.length).toBeGreaterThan(0);
    }

    const blockEntries = (await blockAuditEntries(admin.token)).filter(
      (entry) => entry.action === "block" && entry.targetId === victim.id
    );
    expect(blockEntries.map((entry) => entry.metadata.ip).sort()).toEqual([
      "8.8.8.8",
      "9.9.9.9",
    ]);
    for (const entry of blockEntries) {
      expect(entry.targetType).toBe("user");
      expect(entry.actorId).toBe(admin.id);
    }
  });

  it("defaults each block's expiry to 24 hours", async () => {
    const admin = await roleUser("admin");
    const victim = await anonUser("9.9.9.9");

    await moderate(admin.token, { userId: victim.id, action: "ban" });

    const blocks = await deliveredBlocks();
    expect(blocks).toHaveLength(1);
    const created = blocks[0].createdAt.getTime();
    const expires = blocks[0].expiresAt.getTime();
    expect(Math.abs(expires - created - DAY_MS)).toBeLessThan(1000);
  });

  it("refreshes an existing block's expiry instead of inserting a duplicate when re-blocked", async () => {
    const admin = await roleUser("admin");
    const victim = await anonUser("9.9.9.9");

    await moderate(admin.token, { userId: victim.id, action: "ban" });
    const [first] = await deliveredBlocks();

    const response = await moderate(admin.token, {
      userId: victim.id,
      action: "ban",
    });
    expect(response.statusCode).toBe(200);

    const [refreshed] = await deliveredBlocks();
    expect(refreshed.id).toBe(first.id);
    expect(refreshed.expiresAt.getTime()).toBeGreaterThanOrEqual(
      first.expiresAt.getTime()
    );
  });

  it("creates no Network Blocks when a User is suspended", async () => {
    const moderator = await roleUser("moderator");
    const admin = await roleUser("admin");
    const victim = await anonUser("9.9.9.9");

    const response = await moderate(moderator.token, {
      userId: victim.id,
      action: "suspend",
    });
    expect(response.statusCode).toBe(200);

    expect(await deliveredBlocks()).toHaveLength(0);
    const blockEntries = (await blockAuditEntries(admin.token)).filter(
      (entry) => entry.action === "block"
    );
    expect(blockEntries).toHaveLength(0);
  });

  it("creates no Network Blocks for a User with no captured addresses", async () => {
    const admin = await roleUser("admin");
    const [target] = await memDb.insert(users).values({}).returning();

    const response = await moderate(admin.token, {
      userId: target.id as string,
      action: "ban",
    });
    expect(response.statusCode).toBe(200);

    expect(await deliveredBlocks()).toHaveLength(0);
  });

  it("creates Network Blocks when an admin bans through the admin users endpoint", async () => {
    const admin = await adminSession();
    const victim = await anonUser("9.9.9.9");

    const response = await patchAdminUser(admin, victim.id, {
      status: "banned",
    });
    expect(response.statusCode).toBe(200);

    expect((await deliveredBlocks()).map((block) => block.ip)).toContain(
      "9.9.9.9"
    );
  });

  it("creates no Network Blocks for a non-ban user update", async () => {
    const admin = await adminSession();
    const victim = await anonUser("9.9.9.9");

    expect((await patchAdminUser(admin, victim.id, { status: "suspended" })).statusCode).toBe(200);
    expect(await deliveredBlocks()).toHaveLength(0);

    expect((await patchAdminUser(admin, victim.id, { role: "member" })).statusCode).toBe(200);
    expect(await deliveredBlocks()).toHaveLength(0);
  });

  it("leaves a User's Network Blocks in place when they are unbanned", async () => {
    const admin = await adminSession();
    const adminBearer = await roleUser("admin");
    const victim = await anonUser("9.9.9.9");

    await moderate(adminBearer.token, { userId: victim.id, action: "ban" });
    const [first] = await deliveredBlocks();

    const unban = await patchAdminUser(admin, victim.id, { status: "active" });
    expect(unban.statusCode).toBe(200);
    expect(await deliveredBlocks()).toHaveLength(0);

    await moderate(adminBearer.token, { userId: victim.id, action: "ban" });
    const [again] = await deliveredBlocks();
    expect(again.id).toBe(first.id);
  });
});
