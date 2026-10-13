import { describe, it, expect, afterEach, vi } from "vitest";
import http from "node:http";

// Each test builds a fresh PGlite database and a local HTTP receiver, so the
// default 5s ceiling is too tight when the full suite runs under load.
vi.setConfig({ testTimeout: 20_000 });
import { createHmac } from "node:crypto";
import { buildApp } from "../src/app.js";
import { createMemDb, Database, users } from "@koe/db";
import { eq } from "drizzle-orm";
import { signAccessToken } from "@koe/auth";
import { EventName, UserRole } from "@koe/core";
import { FastifyInstance } from "fastify";

interface CapturedRequest {
  headers: http.IncomingHttpHeaders;
  body: string;
}

interface Receiver {
  url: string;
  requests: CapturedRequest[];
  close: () => Promise<void>;
}

function startReceiver(status = 204): Promise<Receiver> {
  const requests: CapturedRequest[] = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      requests.push({ headers: req.headers, body });
      res.statusCode = status;
      res.end();
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = address && typeof address === "object" ? address.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}/hook`,
        requests,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
            server.closeAllConnections();
          }),
      });
    });
  });
}

function verifySignature(secret: string, request: CapturedRequest): boolean {
  const header = request.headers["x-koe-signature"];
  const received = Array.isArray(header) ? header[0] : header;
  const expected = `sha256=${createHmac("sha256", secret)
    .update(request.body)
    .digest("hex")}`;
  return received === expected;
}

describe("Webhooks (Event Bus) API Seam Integration Tests", () => {
  const jwtSecret = "test-jwt-secret-at-least-32-chars-long";
  const secret = "webhook-signing-secret";
  let app: FastifyInstance;
  let memDb: Database;
  let receivers: Receiver[] = [];

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    await Promise.all(receivers.map((receiver) => receiver.close()));
    receivers = [];
  });

  async function setup(
    events: EventName[],
    options: { active?: boolean; status?: number; preModerationDefault?: boolean } = {}
  ): Promise<Receiver> {
    const receiver = await startReceiver(options.status);
    receivers.push(receiver);

    const { db } = await createMemDb();
    memDb = db;
    app = buildApp({
      db,
      jwtSecret,
      logger: false,
      preModerationDefault: options.preModerationDefault ?? false,
      webhookSubscriptions: [
        {
          url: receiver.url,
          secret,
          events,
          active: options.active ?? true,
        },
      ],
    });
    await app.ready();
    return receiver;
  }

  async function flush(): Promise<void> {
    await app.webhooks.flush();
  }

  async function createThread(ref = "webhook-post"): Promise<string> {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/threads/by-ref/${encodeURIComponent(ref)}`,
    });
    expect(response.statusCode).toBe(200);
    return response.json().id;
  }

  async function anonToken(): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/anonymous",
    });
    expect(response.statusCode).toBe(200);
    return response.json().accessToken;
  }

  async function userIdFor(token: string): Promise<string> {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    return response.json().id;
  }

  async function userToken(role: UserRole = "moderator"): Promise<string> {
    const guestToken = await anonToken();
    const userId = await userIdFor(guestToken);
    await memDb.update(users).set({ role }).where(eq(users.id, userId));
    return signAccessToken({ userId, role }, { secret: jwtSecret, expiresIn: "15m" });
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

  async function moderate(
    token: string,
    payload: Record<string, unknown>
  ) {
    return app.inject({
      method: "POST",
      url: "/api/v1/moderation/actions",
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
  }

  it("delivers a comment.created event with a valid HMAC signature", async () => {
    const receiver = await setup(["comment.created"]);
    const threadId = await createThread();
    const token = await anonToken();

    const commentId = await postComment(threadId, token, "hello webhooks");
    await flush();

    expect(receiver.requests).toHaveLength(1);
    const request = receiver.requests[0];
    expect(request.headers["x-koe-event"]).toBe("comment.created");
    expect(request.headers["content-type"]).toContain("application/json");
    expect(verifySignature(secret, request)).toBe(true);

    const payload = JSON.parse(request.body);
    expect(payload.type).toBe("comment.created");
    expect(payload.id).toBe(request.headers["x-koe-delivery"]);
    expect(payload.data.comment.id).toBe(commentId);
    expect(payload.data.comment.status).toBe("published");
  });

  it("only delivers events the subscription names", async () => {
    const receiver = await setup(["reaction.created"]);
    const threadId = await createThread();
    const token = await anonToken();

    const commentId = await postComment(threadId, token, "just a comment");
    await flush();

    expect(receiver.requests).toHaveLength(0);

    await app.inject({
      method: "POST",
      url: `/api/v1/comments/${commentId}/reactions`,
      headers: { authorization: `Bearer ${token}` },
      payload: { emoji: "👍" },
    });
    await flush();

    expect(receiver.requests).toHaveLength(1);
    expect(receiver.requests[0].headers["x-koe-event"]).toBe("reaction.created");
  });

  it("does not deliver to an inactive subscription", async () => {
    const receiver = await setup(["comment.created"], { active: false });
    const threadId = await createThread();
    const token = await anonToken();

    await postComment(threadId, token, "nobody is listening");
    await flush();

    expect(receiver.requests).toHaveLength(0);
  });

  it("does not fail the API request when the webhook endpoint errors", async () => {
    await setup(["comment.created"], { status: 500 });
    const threadId = await createThread();
    const token = await anonToken();

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: { bodyMd: "still works" },
    });
    await flush();

    expect(response.statusCode).toBe(201);
  });

  it("emits comment.approved when a moderator approves a pending comment", async () => {
    const receiver = await setup(["comment.approved"], {
      preModerationDefault: true,
    });

    const threadId = await createThread("approve-hook");
    const authorToken = await anonToken();
    const moderatorToken = await userToken("moderator");
    const commentId = await postComment(threadId, authorToken, "publish me");

    const response = await moderate(moderatorToken, {
      commentId,
      action: "approve",
    });
    expect(response.statusCode).toBe(200);
    await flush();

    expect(receiver.requests).toHaveLength(1);
    expect(receiver.requests[0].headers["x-koe-event"]).toBe("comment.approved");
    expect(JSON.parse(receiver.requests[0].body).data.comment.id).toBe(commentId);
  });

  it("emits vote.created when a vote is cast", async () => {
    const receiver = await setup(["vote.created"]);
    const threadId = await createThread("vote-hook");
    const token = await anonToken();
    const commentId = await postComment(threadId, token, "vote on me");

    await app.inject({
      method: "POST",
      url: `/api/v1/comments/${commentId}/vote`,
      headers: { authorization: `Bearer ${token}` },
      payload: { value: 1 },
    });
    await flush();

    expect(receiver.requests).toHaveLength(1);
    const payload = JSON.parse(receiver.requests[0].body);
    expect(payload.type).toBe("vote.created");
    expect(payload.data.vote.value).toBe(1);
    expect(payload.data.vote.commentId).toBe(commentId);
  });

  it("emits report.created and report.resolved across the reporting lifecycle", async () => {
    const receiver = await setup(["report.created", "report.resolved"]);
    const threadId = await createThread("report-hook");
    const authorToken = await anonToken();
    const reporterToken = await anonToken();
    const moderatorToken = await userToken("moderator");
    const commentId = await postComment(threadId, authorToken, "report me");

    const reportResponse = await app.inject({
      method: "POST",
      url: `/api/v1/comments/${commentId}/reports`,
      headers: { authorization: `Bearer ${reporterToken}` },
      payload: { reason: "spam" },
    });
    expect(reportResponse.statusCode).toBe(201);

    const actionResponse = await moderate(moderatorToken, {
      commentId,
      action: "reject",
    });
    expect(actionResponse.statusCode).toBe(200);
    await flush();

    const types = receiver.requests.map((request) => request.headers["x-koe-event"]);
    expect(types).toEqual(["report.created", "report.resolved"]);
    const resolved = JSON.parse(receiver.requests[1].body);
    expect(resolved.data.report.commentId).toBe(commentId);
    expect(resolved.data.report.status).toBe("resolved");
  });

  it("emits user.banned when an admin bans a user", async () => {
    const receiver = await setup(["user.banned"]);
    const victimToken = await anonToken();
    const victimId = await userIdFor(victimToken);
    const adminToken = await userToken("admin");

    const response = await moderate(adminToken, {
      userId: victimId,
      action: "ban",
    });
    expect(response.statusCode).toBe(200);
    await flush();

    expect(receiver.requests).toHaveLength(1);
    const payload = JSON.parse(receiver.requests[0].body);
    expect(payload.type).toBe("user.banned");
    expect(payload.data.user.id).toBe(victimId);
    expect(payload.data.user.status).toBe("banned");
  });
});
