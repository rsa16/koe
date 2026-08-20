// @vitest-environment jsdom
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createMemDb } from "@koe/db";
import { buildApp } from "@koe/server/app";
import { FastifyInstance } from "fastify";
import "../src/index.js";
import { KoeComments } from "../src/index.js";

// jsdom provides its own `Uint8Array` realm while `TextEncoder` comes from
// Node. jose checks `instanceof Uint8Array` and would fail across realms, so
// re-wrap encoded bytes in the jsdom realm's Uint8Array.
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

async function waitFor(condition: () => boolean, timeout = 5000) {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error("Timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

// jsdom's own `localStorage` is broken under Node 26 (its origin is opaque), so
// provide an in-memory implementation.
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

fixCrossRealmUint8Array();

describe("<koe-comments> widget", () => {
  let app: FastifyInstance;
  let baseUrl: string;

  beforeAll(async () => {
    const { db } = await createMemDb();
    app = buildApp({
      db,
      jwtSecret: "test-jwt-secret-at-least-32-chars-long",
      logger: false,
    });
    await app.listen({ port: 0, host: "127.0.0.1" });
    const address = app.server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Server did not bind a TCP port");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    installLocalStorageMock();
    localStorage.clear();
    document.body.innerHTML = "";
  });

  function mount(ref: string): KoeComments {
    document.body.innerHTML = `<koe-comments base-url="${baseUrl}" thread-ref="${ref}"></koe-comments>`;
    const element = document.querySelector("koe-comments") as KoeComments;
    return element;
  }

  it("authenticates anonymously and renders an empty comment list", async () => {
    const element = mount("widget-empty");

    await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);

    expect(element.shadowRoot!.querySelector(".comment")).toBeNull();
    expect(
      element.shadowRoot!.querySelector(".comment-list")?.children.length
    ).toBe(0);
    expect(localStorage.getItem("koe_access_token")).toBeTruthy();
  });

  it("posts a comment and reads it back through the API", async () => {
    const element = mount("widget-post");

    await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);

    const textarea = element.shadowRoot!.querySelector("textarea")!;
    textarea.value = "Hello from the widget!";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    const form = element.shadowRoot!.querySelector("form")!;
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await waitFor(() => {
      const items = element.shadowRoot!.querySelectorAll(".comment");
      return (
        items.length === 1 &&
        items[0].textContent?.includes("Hello from the widget!")
      );
    });

    const item = element.shadowRoot!.querySelector(".comment")!;
    expect(item.querySelector(".comment-body")?.textContent).toBe(
      "Hello from the widget!"
    );
    expect(item.querySelector(".pending-badge")?.textContent).toBe(
      "Pending approval"
    );
    expect(element.shadowRoot!.querySelector(".empty")).toBeNull();
  });

  it("reuses the stored anonymous token on subsequent loads", async () => {
    const first = mount("widget-reuse");
    await waitFor(
      () => first.shadowRoot?.querySelector(".empty") !== null
    );
    const storedToken = localStorage.getItem("koe_access_token");
    expect(storedToken).toBeTruthy();

    document.body.innerHTML = "";
    const second = mount("widget-reuse");
    await waitFor(
      () => second.shadowRoot?.querySelector(".empty") !== null
    );

    expect(localStorage.getItem("koe_access_token")).toBe(storedToken);
  });

  it("recovers from a stale stored token by re-authenticating before posting", async () => {
    localStorage.setItem("koe_access_token", "bogus-token");
    const element = mount("widget-stale-token");

    await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);

    const textarea = element.shadowRoot!.querySelector("textarea")!;
    textarea.value = "Posted after stale token recovery";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    const form = element.shadowRoot!.querySelector("form")!;
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await waitFor(() => {
      const items = element.shadowRoot!.querySelectorAll(".comment");
      return (
        items.length === 1 &&
        items[0].textContent?.includes("Posted after stale token recovery")
      );
    });

    expect(localStorage.getItem("koe_access_token")).not.toBe("bogus-token");
  });
});