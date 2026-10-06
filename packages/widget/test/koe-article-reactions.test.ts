// @vitest-environment jsdom
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createKoeClient } from "@koe/sdk";
import { createMemDb } from "@koe/db";
import { buildApp } from "@koe/server/app";
import { FastifyInstance } from "fastify";
import "../src/index.js";
import { KoeArticleReactions } from "../src/index.js";

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
