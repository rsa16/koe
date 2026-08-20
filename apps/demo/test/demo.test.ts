import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { createDemoServer } from "../src/server.js";
import { createKoeClient } from "@koe/sdk";
import { FastifyInstance } from "fastify";

describe("Demo Server & Harness", () => {
  let app: FastifyInstance;
  let baseUrl: string;
  let adminToken: string;

  beforeAll(async () => {
    const demo = await createDemoServer({ port: 0, host: "127.0.0.1" });
    app = demo.app;
    adminToken = demo.seed.adminToken;
    await app.listen({ port: 0, host: "127.0.0.1" });
    const address = app.server.address();
    const port = typeof address === "object" && address ? address.port : 3000;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves the static index.html and widget.js bundle", async () => {
    const htmlRes = await fetch(`${baseUrl}/index.html`);
    expect(htmlRes.status).toBe(200);
    const htmlText = await htmlRes.text();
    expect(htmlText).toContain("<koe-comments");

    const widgetRes = await fetch(`${baseUrl}/widget.js`);
    expect(widgetRes.status).toBe(200);
    const widgetText = await widgetRes.text();
    expect(widgetText).toContain("koe-comments");
  });

  it("has seeded demo thread and comments ready", async () => {
    const client = createKoeClient({ baseUrl });
    const thread = await client.threads.getByRef("demo-article");
    expect(thread.externalRef).toBe("demo-article");

    const commentList = await client.comments.list(thread.id);
    expect(commentList.comments.length).toBeGreaterThan(0);
    expect(commentList.comments[0].status).toBe("published");
  });

  it("permits admin token to query moderation queue", async () => {
    const client = createKoeClient({ baseUrl });
    const queue = await client.moderation.queue(adminToken);
    expect(Array.isArray(queue.comments)).toBe(true);
  });
});
