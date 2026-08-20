// @vitest-environment jsdom
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createKoeClient } from "@koe/sdk";
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

  async function postComment(element: KoeComments, body: string) {
    const textarea = element.shadowRoot!.querySelector("textarea")!;
    textarea.value = body;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    const form = element.shadowRoot!.querySelector("form")!;
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
  }

  async function findCommentId(ref: string, body: string): Promise<string> {
    const client = createKoeClient({ baseUrl });
    const token = localStorage.getItem("koe_access_token")!;
    const thread = await client.threads.getByRef(ref);
    const list = await client.comments.list(thread.id, undefined, token);
    const comment = list.comments.find((c) => c.bodyMd === body);
    if (!comment) {
      throw new Error(`comment "${body}" not found`);
    }
    return comment.id;
  }

  async function reactAs(commentId: string, emoji: string) {
    const client = createKoeClient({ baseUrl });
    const { accessToken } = await client.auth.anonymous();
    await client.comments.react(commentId, emoji, accessToken);
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

  it("opens an inline reply composer that is replaced by the reply on submit", async () => {
    const element = mount("widget-reply");
    await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);

    const textarea = element.shadowRoot!.querySelector("textarea")!;
    textarea.value = "Parent comment";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    const form = element.shadowRoot!.querySelector("form")!;
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    await waitFor(() => {
      const items = element.shadowRoot!.querySelectorAll(".comment");
      return (
        items.length === 1 &&
        items[0].textContent?.includes("Parent comment")
      );
    });

    const li = element.shadowRoot!.querySelector(".comment")!;
    const replyButton = li.querySelector(".reply-button") as HTMLButtonElement;
    replyButton.click();
    await waitFor(() => li.querySelector(".reply-composer") !== null);

    const composer = li.querySelector(".reply-composer");
    expect(composer).not.toBeNull();
    expect(element.shadowRoot!.querySelector(".composer .reply-composer")).toBeNull();
    expect(element.shadowRoot!.querySelector(".reply-target")).toBeNull();

    const replyTextarea = composer!.querySelector("textarea")!;
    replyTextarea.value = "Inline reply text";
    replyTextarea.dispatchEvent(new Event("input", { bubbles: true }));
    (composer!.querySelector("form") as HTMLFormElement).dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await waitFor(() => {
      const items = element.shadowRoot!.querySelectorAll(".comment");
      return (
        items.length === 2 &&
        items[1].textContent?.includes("Inline reply text")
      );
    });

    expect(element.shadowRoot!.querySelector(".reply-composer")).toBeNull();
    const nested = element.shadowRoot!.querySelector(".comment-list--nested");
    expect(nested).not.toBeNull();
    expect(nested?.textContent).toContain("Inline reply text");
  });

  it("shows the top three reactions with an expand toggle and an add button", async () => {
    const element = mount("widget-reactions");
    await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);

    await postComment(element, "Reactable comment");
    await waitFor(() => {
      const items = element.shadowRoot!.querySelectorAll(".comment");
      return (
        items.length === 1 &&
        items[0].textContent?.includes("Reactable comment")
      );
    });

    const commentId = await findCommentId("widget-reactions", "Reactable comment");
    await reactAs(commentId, "👍");
    await reactAs(commentId, "👍");
    await reactAs(commentId, "❤️");
    await reactAs(commentId, "😂");
    await reactAs(commentId, "🎉");

    document.body.innerHTML = "";
    const second = mount("widget-reactions");
    await waitFor(
      () => second.shadowRoot!.querySelectorAll(".comment").length === 1
    );

    const pills = second.shadowRoot!.querySelectorAll(".reaction-button");
    expect(pills.length).toBe(3);
    expect(pills[0].textContent).toContain("👍");
    expect(pills[0].textContent).toContain("2");
    expect(Array.from(pills).some((p) => p.textContent?.includes("❤️"))).toBe(true);
    expect(Array.from(pills).some((p) => p.textContent?.includes("😂"))).toBe(true);
    expect(Array.from(pills).some((p) => p.textContent?.includes("🎉"))).toBe(false);
    expect(second.shadowRoot!.querySelector(".add-reaction-button")).not.toBeNull();

    const toggle = second.shadowRoot!.querySelector(".reactions-toggle")!;
    expect(toggle.textContent?.trim()).toBe("+1 more");
    (toggle as HTMLButtonElement).click();
    await waitFor(
      () => second.shadowRoot!.querySelectorAll(".reaction-button").length === 4
    );
    expect(second.shadowRoot!.querySelector(".reactions-toggle")?.textContent?.trim()).toBe("Show fewer");

    (second.shadowRoot!.querySelector(".reactions-toggle") as HTMLButtonElement).click();
    await waitFor(
      () => second.shadowRoot!.querySelectorAll(".reaction-button").length === 3
    );
  });

  it("shows only an add-reaction button when a comment has no reactions", async () => {
    const element = mount("widget-zero-reactions");
    await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);

    await postComment(element, "No reactions yet");
    await waitFor(() => {
      const items = element.shadowRoot!.querySelectorAll(".comment");
      return (
        items.length === 1 &&
        items[0].textContent?.includes("No reactions yet")
      );
    });

    const commentEl = element.shadowRoot!.querySelector(".comment")!;
    expect(commentEl.querySelectorAll(".reaction-button").length).toBe(0);
    expect(commentEl.querySelector(".reactions-toggle")).toBeNull();
    expect(commentEl.querySelector(".add-reaction-button")).not.toBeNull();
  });

  it("opens a reaction picker from the add button and applies a reaction", async () => {
    const element = mount("widget-picker");
    await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);

    await postComment(element, "Pick on me");
    await waitFor(() => {
      const items = element.shadowRoot!.querySelectorAll(".comment");
      return (
        items.length === 1 && items[0].textContent?.includes("Pick on me")
      );
    });

    const addButton = element.shadowRoot!.querySelector(
      ".add-reaction-button"
    ) as HTMLButtonElement;
    addButton.click();
    await waitFor(
      () => element.shadowRoot?.querySelector(".reaction-picker") !== null
    );

    const pickerButtons = element.shadowRoot!.querySelectorAll(
      ".reaction-picker-button"
    );
    expect(pickerButtons.length).toBe(6);
    const heart = Array.from(pickerButtons).find(
      (b) => b.getAttribute("aria-label") === "React with ❤️"
    ) as HTMLButtonElement;
    heart.click();

    await waitFor(() => {
      const pill = element.shadowRoot!.querySelector(".reaction-button");
      return pill !== null && pill.textContent?.includes("❤️");
    });
    expect(element.shadowRoot!.querySelector(".reaction-picker")).toBeNull();
    expect(
      element.shadowRoot!.querySelector(".reaction-button")?.textContent
    ).toContain("1");
  });
});