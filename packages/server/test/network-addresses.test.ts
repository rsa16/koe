import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createMemDb,
  Database,
  userNetworkAddresses,
  users,
} from "@koe/db";
import { eq } from "drizzle-orm";
import { signAccessToken } from "@koe/auth";
import { UserRole } from "@koe/core";
import { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import {
  DEFAULT_MAX_ADDRESSES_PER_USER,
  pruneExpiredAddresses,
  pruneUserAddresses,
  recordAddress,
} from "../src/plugins/network-addresses.js";
import { parseTrustProxy } from "../src/trust-proxy.js";
import { mergeGuestIntoUser } from "../src/user-accounts.js";

const jwtSecret = "test-jwt-secret-at-least-32-chars-long";
const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * DAY_MS;

async function makeUser(db: Database, role: UserRole = "guest"): Promise<string> {
  const [row] = await db.insert(users).values({ role }).returning();
  return row.id as string;
}

async function listAddresses(db: Database, userId: string): Promise<string[]> {
  const rows = await db
    .select()
    .from(userNetworkAddresses)
    .where(eq(userNetworkAddresses.userId, userId));
  return rows.map((row: { ip: string }) => row.ip);
}

describe("captured client address store", () => {
  let db: Database;

  beforeEach(async () => {
    ({ db } = await createMemDb());
  });

  it("records first-seen and refreshes last-seen without duplicating", async () => {
    const userId = await makeUser(db);
    const t0 = new Date("2026-01-01T00:00:00Z");
    const t1 = new Date("2026-01-02T00:00:00Z");

    await recordAddress(db, {
      userId,
      ip: "1.1.1.1",
      retentionMs: YEAR_MS,
      maxPerUser: DEFAULT_MAX_ADDRESSES_PER_USER,
      now: t0,
    });
    await recordAddress(db, {
      userId,
      ip: "1.1.1.1",
      retentionMs: YEAR_MS,
      maxPerUser: DEFAULT_MAX_ADDRESSES_PER_USER,
      now: t1,
    });

    const rows = await db
      .select()
      .from(userNetworkAddresses)
      .where(eq(userNetworkAddresses.userId, userId));

    expect(rows).toHaveLength(1);
    expect(rows[0].firstSeenAt.getTime()).toBe(t0.getTime());
    expect(rows[0].lastSeenAt.getTime()).toBe(t1.getTime());
  });

  it("caps the distinct addresses kept per User, dropping the least recent", async () => {
    const userId = await makeUser(db);
    const base = new Date("2026-01-01T00:00:00Z");

    for (let i = 0; i < 3; i += 1) {
      await recordAddress(db, {
        userId,
        ip: `10.0.0.${i}`,
        retentionMs: YEAR_MS,
        maxPerUser: 2,
        now: new Date(base.getTime() + i),
      });
    }

    expect((await listAddresses(db, userId)).sort()).toEqual([
      "10.0.0.1",
      "10.0.0.2",
    ]);
  });

  it("drops a User's addresses once past the retention window", async () => {
    const userId = await makeUser(db);
    const retentionMs = 1000;
    const t0 = new Date("2026-01-01T00:00:00Z");

    await recordAddress(db, {
      userId,
      ip: "1.1.1.1",
      retentionMs,
      maxPerUser: DEFAULT_MAX_ADDRESSES_PER_USER,
      now: t0,
    });
    await recordAddress(db, {
      userId,
      ip: "2.2.2.2",
      retentionMs,
      maxPerUser: DEFAULT_MAX_ADDRESSES_PER_USER,
      now: new Date(t0.getTime() + retentionMs + 1),
    });

    expect(await listAddresses(db, userId)).toEqual(["2.2.2.2"]);
  });

  it("global sweep prunes every User's stale addresses but keeps fresh ones", async () => {
    const staleUser = await makeUser(db);
    const freshUser = await makeUser(db);
    const retentionMs = 1000;
    const t0 = new Date("2026-01-01T00:00:00Z");

    await recordAddress(db, {
      userId: staleUser,
      ip: "1.1.1.1",
      retentionMs: YEAR_MS,
      maxPerUser: DEFAULT_MAX_ADDRESSES_PER_USER,
      now: t0,
    });
    await recordAddress(db, {
      userId: freshUser,
      ip: "2.2.2.2",
      retentionMs: YEAR_MS,
      maxPerUser: DEFAULT_MAX_ADDRESSES_PER_USER,
      now: new Date(t0.getTime() + retentionMs + 1),
    });

    await pruneExpiredAddresses(
      db,
      retentionMs,
      new Date(t0.getTime() + retentionMs + 1)
    );

    expect(await listAddresses(db, staleUser)).toEqual([]);
    expect(await listAddresses(db, freshUser)).toEqual(["2.2.2.2"]);
  });

  it("pruneUserAddresses is a no-op for an unknown User", async () => {
    await pruneUserAddresses(db, "00000000-0000-0000-0000-000000000000", {
      retentionMs: YEAR_MS,
      maxPerUser: DEFAULT_MAX_ADDRESSES_PER_USER,
    });
    expect(await listAddresses(db, "00000000-0000-0000-0000-000000000000")).toEqual(
      []
    );
  });

  it("carries captured addresses when a guest is merged into an account", async () => {
    const guest = await makeUser(db);
    const target = await makeUser(db, "member");

    await recordAddress(db, {
      userId: guest,
      ip: "1.1.1.1",
      retentionMs: YEAR_MS,
      maxPerUser: DEFAULT_MAX_ADDRESSES_PER_USER,
    });
    await recordAddress(db, {
      userId: guest,
      ip: "2.2.2.2",
      retentionMs: YEAR_MS,
      maxPerUser: DEFAULT_MAX_ADDRESSES_PER_USER,
    });
    await recordAddress(db, {
      userId: target,
      ip: "2.2.2.2",
      retentionMs: YEAR_MS,
      maxPerUser: DEFAULT_MAX_ADDRESSES_PER_USER,
    });

    await mergeGuestIntoUser(db, guest, target);

    expect((await listAddresses(db, target)).sort()).toEqual([
      "1.1.1.1",
      "2.2.2.2",
    ]);
    expect(await listAddresses(db, guest)).toEqual([]);
  });
});

describe("client address capture (API seam)", () => {
  let apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps = [];
  });

  async function setup(
    networkAddresses?: { enabled: boolean; retentionMs: number }
  ): Promise<{ app: FastifyInstance; db: Database }> {
    const { db } = await createMemDb();
    const app = buildApp({
      db,
      jwtSecret,
      logger: false,
      trustProxy: parseTrustProxy("127.0.0.1"),
      networkAddresses: networkAddresses ?? { enabled: true, retentionMs: YEAR_MS },
    });
    await app.ready();
    apps.push(app);
    return { app, db };
  }

  function anon(
    app: FastifyInstance,
    forwardedFor?: string
  ): Promise<{ id: string; token: string }> {
    return app
      .inject({
        method: "POST",
        url: "/api/v1/auth/anonymous",
        headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : {},
      })
      .then((response) => {
        expect(response.statusCode).toBe(200);
        const body = response.json();
        return { id: body.user.id as string, token: body.accessToken as string };
      });
  }

  async function createThread(app: FastifyInstance): Promise<string> {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/threads/by-ref/capture-addresses-thread",
    });
    expect(response.statusCode).toBe(200);
    return response.json().id;
  }

  function postComment(
    app: FastifyInstance,
    threadId: string,
    token: string,
    forwardedFor: string
  ) {
    return app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/comments`,
      headers: {
        authorization: `Bearer ${token}`,
        "x-forwarded-for": forwardedFor,
      },
      payload: { bodyMd: `from ${forwardedFor}` },
    });
  }

  it("records no address when the feature flag is off", async () => {
    const { app, db } = await setup({ enabled: false, retentionMs: YEAR_MS });
    const { id, token } = await anon(app, "9.9.9.9");
    const threadId = await createThread(app);

    expect(
      (await postComment(app, threadId, token, "9.9.9.9")).statusCode
    ).toBe(201);

    expect(await listAddresses(db, id)).toEqual([]);
  });

  it("captures the acting address on a write for a guest", async () => {
    const { app, db } = await setup();
    const threadId = await createThread(app);
    const { id, token } = await anon(app);

    expect(
      (await postComment(app, threadId, token, "9.9.9.9")).statusCode
    ).toBe(201);

    expect(await listAddresses(db, id)).toContain("9.9.9.9");
  });

  it("captures the address against the new User on anonymous bootstrap", async () => {
    const { app, db } = await setup();
    const { id } = await anon(app, "5.5.5.5");

    expect(await listAddresses(db, id)).toEqual(["5.5.5.5"]);
  });

  it("captures writes for authenticated members, not just guests", async () => {
    const { app, db } = await setup();
    const threadId = await createThread(app);
    const { id, token } = await anon(app);
    await db.update(users).set({ role: "member" }).where(eq(users.id, id));

    expect(
      (await postComment(app, threadId, token, "8.8.8.8")).statusCode
    ).toBe(201);

    expect(await listAddresses(db, id)).toContain("8.8.8.8");
  });

  it("does not capture on read requests", async () => {
    const { app, db } = await setup();
    const threadId = await createThread(app);
    const { id, token } = await anon(app);
    await db
      .delete(userNetworkAddresses)
      .where(eq(userNetworkAddresses.userId, id));

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/threads/${threadId}/comments`,
      headers: { authorization: `Bearer ${token}`, "x-forwarded-for": "7.7.7.7" },
    });
    expect(response.statusCode).toBe(200);

    expect(await listAddresses(db, id)).toEqual([]);
  });
});
