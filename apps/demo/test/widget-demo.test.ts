// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createDemoServer } from "../src/server.js";
import { FastifyInstance } from "fastify";
import "@koe/widget";
import { KoeComments } from "@koe/widget";

function installLocalStorageMock() {
  let store: Record<string, string> = {};
  const storage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
  Object.defineProperty(window, "localStorage", {
    value: storage,
    configurable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
}

function fixCrossRealmUint8Array() {
  const RealmUint8Array = Uint8Array;
  const encoder = new TextEncoder();
  const originalEncode = TextEncoder.prototype.encode;
  Object.defineProperty(TextEncoder.prototype, "encode", {
    configurable: true,
    value(input: string) {
      const bytes = originalEncode.call(encoder, input);
      return new RealmUint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    },
  });
}

async function waitFor(condition: () => boolean, timeout = 3000) {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error("Timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

fixCrossRealmUint8Array();

describe("Widget in Demo Page Environment", () => {
  let app: FastifyInstance;
  let baseUrl: string;
  let demo: Awaited<ReturnType<typeof createDemoServer>>;

  beforeAll(async () => {
    installLocalStorageMock();
    demo = await createDemoServer({ port: 0, host: "127.0.0.1" });
    app = demo.app;
    await app.listen({ port: 0, host: "127.0.0.1" });
    const address = app.server.address();
    const port = typeof address === "object" && address ? address.port : 3000;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it("loads and displays comments when base-url is empty (relative mode)", async () => {
    // window.location in jsdom points to origin
    const el = document.createElement("koe-comments") as KoeComments;
    el.setAttribute("base-url", baseUrl);
    el.setAttribute("thread-ref", "demo-article");
    document.body.appendChild(el);

    await waitFor(() => {
      const text = el.shadowRoot?.textContent || "";
      return !text.includes("Loading comments...") && text.includes("Welcome to Koe");
    });

    expect(el.shadowRoot?.textContent).toContain("Welcome to Koe");
    expect(el.shadowRoot?.textContent).not.toContain("Loading comments...");
  });

  it("shows a Flair after it is assigned through the service API", async () => {
    const sessionResponse = await app.inject({
      method: "POST",
      url: "/api/v1/admin/session",
      headers: { authorization: `Bearer ${demo.seed.adminToken}` },
    });
    expect(sessionResponse.statusCode).toBe(200);
    const csrf = sessionResponse.json().csrfToken as string;
    const adminSession = sessionResponse.cookies.find(
      (cookie) => cookie.name === "koe_admin_session"
    )!.value;

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/admin/flairs",
      cookies: { koe_admin_session: adminSession, koe_csrf: csrf },
      headers: { "x-csrf-token": csrf },
      payload: {
        slug: "widget-demo-supporter",
        label: "Supporter",
        colour: "#7c3aed",
        rank: 100,
      },
    });
    expect(createResponse.statusCode).toBe(201);

    const assignResponse = await app.inject({
      method: "PUT",
      url: `/api/v1/service/users/${demo.seed.demoAuthor.id}/flairs`,
      headers: { authorization: `Bearer ${demo.serviceToken}` },
      payload: { slugs: ["widget-demo-supporter"] },
    });
    expect(assignResponse.statusCode).toBe(200);

    const el = document.createElement("koe-comments") as KoeComments;
    el.setAttribute("base-url", baseUrl);
    el.setAttribute("thread-ref", "demo-article");
    document.body.appendChild(el);

    await waitFor(
      () =>
        el.shadowRoot?.querySelector('[part="flair"]')?.textContent?.trim() ===
        "Supporter"
    );

    const flair = el.shadowRoot!.querySelector(
      '[part="flair"]'
    ) as HTMLElement;
    expect(flair).not.toBeNull();
    expect(flair.style.getPropertyValue("--koe-flair-colour")).toBe("#7c3aed");
  });
});
