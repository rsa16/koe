// @vitest-environment jsdom
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createKoeClient } from "@koe/sdk";
import { createMemDb } from "@koe/db";
import { buildApp } from "@koe/server/app";
import { FastifyInstance } from "fastify";
import "../src/index.js";
import {
  AUTH_EXPIRED_EVENT,
  KoeArticleReactions,
} from "../src/index.js";

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

describe("<koe-article-reactions> widget", () => {
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

  function mount(ref: string, attributes = ""): KoeArticleReactions {
    document.body.innerHTML = `<koe-article-reactions base-url="${baseUrl}" thread-ref="${ref}" ${attributes}></koe-article-reactions>`;
    return document.querySelector(
      "koe-article-reactions"
    ) as KoeArticleReactions;
  }

  function buttonFor(
    element: KoeArticleReactions,
    emoji: string
  ): HTMLButtonElement {
    return element.shadowRoot!.querySelector(
      `.article-reaction-button[data-emoji="${emoji}"]`
    ) as HTMLButtonElement;
  }

  async function waitForButtons(element: KoeArticleReactions) {
    await waitFor(
      () =>
        element.shadowRoot!.querySelectorAll(".article-reaction-button")
          .length > 0
    );
  }

  async function threadTotals(ref: string): Promise<Record<string, number>> {
    const client = createKoeClient({ baseUrl });
    const thread = await client.threads.getByRef(ref);
    return thread.reactionTotals;
  }

  it("renders a button with a count for every allowed emoji", async () => {
    const element = mount("article-empty");
    await waitForButtons(element);

    const buttons = element.shadowRoot!.querySelectorAll(
      ".article-reaction-button"
    );
    expect(buttons.length).toBe(6);
    for (const button of Array.from(buttons)) {
      expect(button.querySelector(".reaction-count")?.textContent?.trim()).toBe(
        "0"
      );
      expect(button.getAttribute("aria-pressed")).toBe("false");
    }
  });

  it("reacts to the article, updating the count and active state", async () => {
    const element = mount("article-react");
    await waitForButtons(element);

    buttonFor(element, "👍").click();

    await waitFor(() => buttonFor(element, "👍").getAttribute("aria-pressed") === "true");
    expect(
      buttonFor(element, "👍").querySelector(".reaction-count")?.textContent?.trim()
    ).toBe("1");
    await expect(threadTotals("article-react")).resolves.toEqual({ "👍": 1 });
  });

  it("toggles the reaction off on a second click", async () => {
    const element = mount("article-toggle");
    await waitForButtons(element);

    buttonFor(element, "❤️").click();
    await waitFor(() => buttonFor(element, "❤️").getAttribute("aria-pressed") === "true");

    buttonFor(element, "❤️").click();
    await waitFor(() => buttonFor(element, "❤️").getAttribute("aria-pressed") === "false");
    expect(
      buttonFor(element, "❤️").querySelector(".reaction-count")?.textContent?.trim()
    ).toBe("0");
    await expect(threadTotals("article-toggle")).resolves.toEqual({});
  });

  it("restores the current user's active reaction on reload", async () => {
    const first = mount("article-persist");
    await waitForButtons(first);
    buttonFor(first, "🎉").click();
    await waitFor(() => buttonFor(first, "🎉").getAttribute("aria-pressed") === "true");

    document.body.innerHTML = "";
    const second = mount("article-persist");
    await waitForButtons(second);

    await waitFor(() => buttonFor(second, "🎉").getAttribute("aria-pressed") === "true");
    expect(
      buttonFor(second, "🎉").querySelector(".reaction-count")?.textContent?.trim()
    ).toBe("1");
  });

  it("reflects other users' reactions in the count without marking them active", async () => {
    const client = createKoeClient({ baseUrl });
    const { accessToken } = await client.auth.anonymous();
    const thread = await client.threads.getByRef("article-others");
    await client.threads.react(thread.id, "😂", accessToken);

    const element = mount("article-others");
    await waitForButtons(element);

    await waitFor(
      () =>
        buttonFor(element, "😂")
          .querySelector(".reaction-count")
          ?.textContent?.trim() === "1"
    );
    expect(buttonFor(element, "😂").getAttribute("aria-pressed")).toBe("false");
  });

  it("honors the reaction-emojis attribute", async () => {
    const element = mount("article-allowlist", 'reaction-emojis="🎉,👍"');
    await waitForButtons(element);

    const buttons = element.shadowRoot!.querySelectorAll(
      ".article-reaction-button"
    );
    expect(buttons.length).toBe(2);
    expect(buttonFor(element, "🎉")).not.toBeNull();
    expect(buttonFor(element, "👍")).not.toBeNull();
  });

  it("uses a host-supplied token without creating or persisting a guest session", async () => {
    const client = createKoeClient({ baseUrl });
    const { accessToken } = await client.auth.anonymous();
    localStorage.clear();

    const element = mount("article-host-token", `token="${accessToken}"`);
    await waitForButtons(element);

    buttonFor(element, "👍").click();
    await waitFor(
      () => buttonFor(element, "👍").getAttribute("aria-pressed") === "true"
    );

    const thread = await client.threads.getByRef(
      "article-host-token",
      undefined,
      accessToken
    );
    expect(thread.userReactions).toContain("👍");
    expect(localStorage.getItem("koe_access_token")).toBeNull();
  });

  it("emits koe-auth-expired with the thread ref on a 401 instead of re-anonymising", async () => {
    const events: CustomEvent[] = [];
    const element = mount("article-host-expired", `token="expired-token"`);
    element.addEventListener(AUTH_EXPIRED_EVENT, (e) =>
      events.push(e as CustomEvent)
    );

    await waitFor(() => events.length > 0);
    expect(events[0].detail.threadRef).toBe("article-host-expired");
    expect(localStorage.getItem("koe_access_token")).toBeNull();
  });

  it("refetches with the new token when the host updates it", async () => {
    const client = createKoeClient({ baseUrl });
    const first = await client.auth.anonymous();
    const second = await client.auth.anonymous();

    const seenAuth: (string | null)[] = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/by-ref/")) {
        seenAuth.push(new Headers(init?.headers).get("authorization"));
      }
      return realFetch(input, init);
    }) as typeof globalThis.fetch;

    try {
      const element = mount(
        "article-host-refresh",
        `token="${first.accessToken}"`
      );
      await waitForButtons(element);
      seenAuth.length = 0;

      element.token = second.accessToken;
      await waitFor(() => seenAuth.includes(`Bearer ${second.accessToken}`));
      expect(localStorage.getItem("koe_access_token")).toBeNull();
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("routes requests through a non-default api-base prefix", async () => {
    const realFetch = globalThis.fetch;
    const prefixedUrls: string[] = [];
    globalThis.fetch = (async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/comments/v1/")) {
        prefixedUrls.push(url);
        return realFetch(url.replace("/api/comments/v1/", "/api/v1/"), init);
      }
      return realFetch(input, init);
    }) as typeof globalThis.fetch;

    try {
      const element = mount(
        "article-api-base",
        `api-base="/api/comments/v1"`
      );
      await waitForButtons(element);

      expect(prefixedUrls.length).toBeGreaterThan(0);
      expect(
        prefixedUrls.every((url) => url.includes("/api/comments/v1/"))
      ).toBe(true);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("sources all styling from documented --koe-* tokens", () => {
    const cssText = KoeArticleReactions.styles
      .map((style) => style.cssText)
      .join("\n");
    for (const token of [
      "--koe-surface",
      "--koe-text",
      "--koe-accent",
      "--koe-border",
      "--koe-radius",
      "--koe-font",
      "--koe-space",
    ]) {
      expect(cssText).toContain(token);
    }
    expect(cssText).toContain(":host([theme=dark])");
    expect(cssText).not.toMatch(/(text|bg|border|from|to)-slate-/);
  });

  it("exposes a reactive theme property and structural parts and slots", async () => {
    const element = mount("article-contract");
    await waitForButtons(element);

    expect(element.theme).toBe("light");
    expect(element.getAttribute("theme")).toBe("light");
    element.theme = "dark";
    await element.updateComplete;
    expect(element.getAttribute("theme")).toBe("dark");

    for (const part of ["root", "group", "reaction", "reaction-count"]) {
      expect(
        element.shadowRoot!.querySelector(`[part~="${part}"]`)
      ).not.toBeNull();
    }

    for (const name of ["label", "footer"]) {
      expect(
        element.shadowRoot!.querySelector(`slot[name="${name}"]`)
      ).not.toBeNull();
    }
  });
});
