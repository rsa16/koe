import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb, Database, networkBlocks, users } from "@koe/db";
import { eq } from "drizzle-orm";
import { signAccessToken } from "@koe/auth";
import { UserRole } from "@koe/core";
import { FastifyInstance } from "fastify";
import { parseTrustProxy } from "../src/trust-proxy.js";

const jwtSecret = "test-jwt-secret-at-least-32-chars-long";
const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * DAY_MS;
const BLOCKED_IP = "8.8.8.8";

describe("Network Block Enforcement API Seam Integration Tests", () => {
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

  async function createThread(ref: string): Promise<string> {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/threads/by-ref/${encodeURIComponent(ref)}`,
    });
    expect(response.statusCode).toBe(200);
    return response.json().id as string;
  }

  async function blockIp(
    ip: string,
    expiresAt: Date = new Date(Date.now() + DAY_MS)
  ): Promise<void> {
    await memDb.insert(networkBlocks).values({
      ip,
      reason: "test block",
      source: "auto",
      createdBy: founderId,
      expiresAt,
    });
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

  /** Creates a published comment authored from an unrelated, unblocked address. */
  async function seedComment(threadId: string): Promise<string> {
    const author = await anonUser();
    const response = await interact(
      author.token,
      "10.0.0.1",
      "POST",
      `/api/v1/threads/${threadId}/comments`,
      { bodyMd: "unrelated author" }
    );
    expect(response.statusCode).toBe(201);
    return response.json().id as string;
  }

  it("rejects a comment from a blocked address with RFC 9457 Problem Details", async () => {
    const threadId = await createThread("blocked-comment");
    await blockIp(BLOCKED_IP);
    const guest = await anonUser();

    const response = await interact(
      guest.token,
      BLOCKED_IP,
      "POST",
      `/api/v1/threads/${threadId}/comments`,
      { bodyMd: "let me in" }
    );

    expect(response.statusCode).toBe(403);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json"
    );
    expect(response.json()).toMatchObject({
      status: 403,
      title: "Forbidden",
    });
  });

  it("rejects votes, reactions, and reports from a blocked address", async () => {
    const threadId = await createThread("blocked-interactions");
    const commentId = await seedComment(threadId);
    await blockIp(BLOCKED_IP);
    const guest = await anonUser();

    const vote = await interact(
      guest.token,
      BLOCKED_IP,
      "POST",
      `/api/v1/comments/${commentId}/vote`,
      { value: 1 }
    );
    expect(vote.statusCode).toBe(403);

    const reaction = await interact(
      guest.token,
      BLOCKED_IP,
      "POST",
      `/api/v1/comments/${commentId}/reactions`,
      { emoji: "👍" }
    );
    expect(reaction.statusCode).toBe(403);

    const report = await interact(
      guest.token,
      BLOCKED_IP,
      "POST",
      `/api/v1/comments/${commentId}/reports`,
      { reason: "spam" }
    );
    expect(report.statusCode).toBe(403);
  });

  it("is identity-independent: a fresh anonymous identity from a blocked address is still rejected", async () => {
    const threadId = await createThread("blocked-fresh-identity");
    await blockIp(BLOCKED_IP);
    const first = await anonUser();
    const second = await anonUser();

    const firstAttempt = await interact(
      first.token,
      BLOCKED_IP,
      "POST",
      `/api/v1/threads/${threadId}/comments`,
      { bodyMd: "first identity" }
    );
    const secondAttempt = await interact(
      second.token,
      BLOCKED_IP,
      "POST",
      `/api/v1/threads/${threadId}/comments`,
      { bodyMd: "second identity" }
    );

    expect(firstAttempt.statusCode).toBe(403);
    expect(secondAttempt.statusCode).toBe(403);
  });

  it("is identity-independent: a linked member account from a blocked address is still rejected", async () => {
    const threadId = await createThread("blocked-member");
    await blockIp(BLOCKED_IP);
    const member = await roleUser("member");

    const response = await interact(
      member.token,
      BLOCKED_IP,
      "POST",
      `/api/v1/threads/${threadId}/comments`,
      { bodyMd: "member" }
    );

    expect(response.statusCode).toBe(403);
  });

  it("lets an authenticated admin bypass enforcement from a blocked address", async () => {
    const threadId = await createThread("blocked-admin");
    await blockIp(BLOCKED_IP);
    const admin = await roleUser("admin");

    const response = await interact(
      admin.token,
      BLOCKED_IP,
      "POST",
      `/api/v1/threads/${threadId}/comments`,
      { bodyMd: "admin here" }
    );

    expect(response.statusCode).toBe(201);
  });

  it("does not affect read interactions from a blocked address", async () => {
    const threadId = await createThread("blocked-read");
    await blockIp(BLOCKED_IP);

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/threads/${threadId}/comments`,
      headers: { "x-forwarded-for": BLOCKED_IP },
    });

    expect(response.statusCode).toBe(200);
  });

  it("stops rejecting once a block has expired", async () => {
    const threadId = await createThread("expired-block");
    await blockIp(BLOCKED_IP, new Date(Date.now() - 1000));
    const guest = await anonUser();

    const response = await interact(
      guest.token,
      BLOCKED_IP,
      "POST",
      `/api/v1/threads/${threadId}/comments`,
      { bodyMd: "block expired" }
    );

    expect(response.statusCode).toBe(201);
  });

  it("rejects a blocked address even when address capture is disabled", async () => {
    await app.close();
    const { db } = await createMemDb();
    memDb = db;
    app = buildApp({
      db,
      jwtSecret,
      logger: false,
      preModerationDefault: false,
      trustProxy: parseTrustProxy("127.0.0.1"),
      networkAddresses: { enabled: false, retentionMs: 0 },
    });
    await app.ready();
    const [founder] = await memDb
      .insert(users)
      .values({ role: "admin" })
      .returning();
    founderId = founder.id as string;

    const threadId = await createThread("capture-disabled");
    await blockIp(BLOCKED_IP);
    const guest = await anonUser();

    const response = await interact(
      guest.token,
      BLOCKED_IP,
      "POST",
      `/api/v1/threads/${threadId}/comments`,
      { bodyMd: "still blocked" }
    );

    expect(response.statusCode).toBe(403);
  });

  it("end-to-end: after an admin bans a guest, that address can no longer interact", async () => {
    const admin = await roleUser("admin");
    const threadId = await createThread("ban-then-block");
    const victim = await anonUser();

    const victimComment = await interact(
      victim.token,
      BLOCKED_IP,
      "POST",
      `/api/v1/threads/${threadId}/comments`,
      { bodyMd: "abuse" }
    );
    expect(victimComment.statusCode).toBe(201);

    const ban = await app.inject({
      method: "POST",
      url: "/api/v1/moderation/actions",
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { userId: victim.id, action: "ban" },
    });
    expect(ban.statusCode).toBe(200);

    const fresh = await anonUser();
    const comment = await interact(
      fresh.token,
      BLOCKED_IP,
      "POST",
      `/api/v1/threads/${threadId}/comments`,
      { bodyMd: "evaded" }
    );
    expect(comment.statusCode).toBe(403);

    const vote = await interact(
      fresh.token,
      BLOCKED_IP,
      "POST",
      `/api/v1/comments/${victimComment.json().id}/vote`,
      { value: 1 }
    );
    expect(vote.statusCode).toBe(403);

    const reaction = await interact(
      fresh.token,
      BLOCKED_IP,
      "POST",
      `/api/v1/comments/${victimComment.json().id}/reactions`,
      { emoji: "👍" }
    );
    expect(reaction.statusCode).toBe(403);

    const report = await interact(
      fresh.token,
      BLOCKED_IP,
      "POST",
      `/api/v1/comments/${victimComment.json().id}/reports`,
      { reason: "spam" }
    );
    expect(report.statusCode).toBe(403);
  });
});
