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

  beforeAll(async () => {
    installLocalStorageMock();
    const demo = await createDemoServer({ port: 0, host: "127.0.0.1" });
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
});
