// @vitest-environment jsdom
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createKoeClient } from "@koe/sdk";
import { createMemDb } from "@koe/db";
import { buildApp } from "@koe/server/app";
import { FastifyInstance } from "fastify";
import "../src/index.js";
import { AUTH_EXPIRED_EVENT, KoeComments } from "../src/index.js";

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

  function mount(ref: string, attributes = ""): KoeComments {
    document.body.innerHTML = `<koe-comments base-url="${baseUrl}" thread-ref="${ref}" ${attributes}></koe-comments>`;
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

  function selectMediaFile(element: KoeComments, file: File) {
    const input = element.shadowRoot!.querySelector(
      ".composer input[type='file']"
    ) as HTMLInputElement;
    Object.defineProperty(input, "files", {
      value: [file],
      configurable: true,
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function pasteInto(
    element: KoeComments,
    clipboardData: { items: unknown[]; files: unknown[] }
  ): Event {
    const textarea = element.shadowRoot!.querySelector("textarea")!;
    const paste = new Event("paste", {
      bubbles: true,
      cancelable: true,
    }) as ClipboardEvent;
    Object.defineProperty(paste, "clipboardData", { value: clipboardData });
    textarea.dispatchEvent(paste);
    return paste;
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

  it("renders the author's display name for named users", async () => {
    const client = createKoeClient({ baseUrl });
    const { accessToken } = await client.auth.anonymous();
    await client.auth.updateMe({ name: "Alice" }, accessToken);
    localStorage.clear();

    const element = mount("widget-author-name", `token="${accessToken}"`);
    await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);

    await postComment(element, "Hello from Alice");
    await waitFor(
      () =>
        element.shadowRoot!.querySelector('[part~="author"]')?.textContent
          ?.trim() === "Alice"
    );

    expect(
      element.shadowRoot!.querySelector('[part~="author"]')?.textContent?.trim()
    ).toBe("Alice");
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

  it("uses a host-supplied token without creating or persisting a guest session", async () => {
    const client = createKoeClient({ baseUrl });
    const { accessToken } = await client.auth.anonymous();
    const hostUser = await client.auth.me(accessToken);
    localStorage.clear();

    const element = mount("widget-host-token", `token="${accessToken}"`);
    await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);

    expect(localStorage.getItem("koe_access_token")).toBeNull();

    await postComment(element, "Posted as the host identity");
    await waitFor(() => {
      const items = element.shadowRoot!.querySelectorAll(".comment");
      return (
        items.length === 1 &&
        items[0].textContent?.includes("Posted as the host identity")
      );
    });

    const thread = await client.threads.getByRef("widget-host-token");
    const list = await client.comments.list(thread.id, undefined, accessToken);
    const comment = list.comments.find(
      (c) => c.bodyMd === "Posted as the host identity"
    );
    expect(comment?.authorId).toBe(hostUser.id);
    expect(localStorage.getItem("koe_access_token")).toBeNull();
  });

  it("applies a token set immediately after the element is connected", async () => {
    const client = createKoeClient({ baseUrl });
    const { accessToken } = await client.auth.anonymous();
    const hostUser = await client.auth.me(accessToken);
    localStorage.clear();

    const element = document.createElement("koe-comments") as KoeComments;
    element.baseUrl = baseUrl;
    element.threadRef = "widget-late-token";
    document.body.appendChild(element);
    element.token = accessToken;

    await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);
    expect(localStorage.getItem("koe_access_token")).toBeNull();

    await postComment(element, "Late token comment");
    await waitFor(
      () => element.shadowRoot!.querySelectorAll(".comment").length === 1
    );

    const thread = await client.threads.getByRef("widget-late-token");
    const list = await client.comments.list(thread.id, undefined, accessToken);
    expect(
      list.comments.find((c) => c.bodyMd === "Late token comment")?.authorId
    ).toBe(hostUser.id);
  });

  it("emits koe-auth-expired with the thread ref on a 401 instead of re-anonymising", async () => {
    const events: CustomEvent[] = [];
    const element = mount("widget-host-expired", `token="expired-token"`);
    element.addEventListener(AUTH_EXPIRED_EVENT, (e) =>
      events.push(e as CustomEvent)
    );

    await waitFor(() => events.length > 0);
    expect(events[0].detail.threadRef).toBe("widget-host-expired");
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
      if (url.includes("/comments")) {
        seenAuth.push(new Headers(init?.headers).get("authorization"));
      }
      return realFetch(input, init);
    }) as typeof globalThis.fetch;

    try {
      const element = mount(
        "widget-host-refresh",
        `token="${first.accessToken}"`
      );
      await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);
      seenAuth.length = 0;

      element.token = second.accessToken;
      await waitFor(() => seenAuth.includes(`Bearer ${second.accessToken}`));
      expect(localStorage.getItem("koe_access_token")).toBeNull();
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("falls back to a guest session when the host clears the token", async () => {
    const client = createKoeClient({ baseUrl });
    const { accessToken } = await client.auth.anonymous();

    const element = mount("widget-host-logout", `token="${accessToken}"`);
    await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);
    expect(localStorage.getItem("koe_access_token")).toBeNull();

    element.token = "";
    await waitFor(() => localStorage.getItem("koe_access_token") !== null);
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

  it("hides the image upload button until a media provider is configured", async () => {
    const element = mount("widget-media-off");
    await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);

    const textarea = element.shadowRoot!.querySelector("textarea")!;
    textarea.value = "A draft";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await element.updateComplete;

    expect(
      element.shadowRoot!.querySelector(".media-upload-button")
    ).toBeNull();
  });

  it("uploads a selected image via the media provider and inserts markdown", async () => {
    const element = mount("widget-media");
    await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);

    const uploads: Blob[] = [];
    element.setMediaProvider({
      upload: async (file) => {
        uploads.push(file);
        return { url: "https://i.ibb.co/abc/pic.png" };
      },
    });

    const textarea = element.shadowRoot!.querySelector("textarea")!;
    textarea.value = "Look: ";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await element.updateComplete;

    const uploadButton = element.shadowRoot!.querySelector(
      ".media-upload-button"
    ) as HTMLButtonElement;
    expect(uploadButton).not.toBeNull();
    uploadButton.click();
    await element.updateComplete;

    selectMediaFile(
      element,
      new File(["bytes"], "cat.png", { type: "image/png" })
    );

    await waitFor(() =>
      (element.shadowRoot!.querySelector("textarea") as HTMLTextAreaElement).value.includes(
        "![image](https://i.ibb.co/abc/pic.png)"
      )
    );

    expect(uploads).toHaveLength(1);
    expect(uploads[0]).toBeInstanceOf(File);
  });

  it("creates an imgbb provider from the media-api-key attribute", async () => {
    const realFetch = globalThis.fetch;
    const imgbbCalls: string[] = [];
    globalThis.fetch = (async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("https://api.imgbb.com")) {
        imgbbCalls.push(url);
        return new Response(
          JSON.stringify({
            data: { url: "https://i.ibb.co/attr/pic.png" },
            success: true,
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          }
        );
      }
      return realFetch(input, init);
    }) as typeof globalThis.fetch;

    try {
      document.body.innerHTML = `<koe-comments base-url="${baseUrl}" thread-ref="widget-media-attr" media-api-key="client-key"></koe-comments>`;
      const element = document.querySelector("koe-comments") as KoeComments;
      await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);

      const textarea = element.shadowRoot!.querySelector("textarea")!;
      textarea.value = "From attribute: ";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      await element.updateComplete;

      selectMediaFile(
        element,
        new File(["bytes"], "dog.png", { type: "image/png" })
      );

      await waitFor(() =>
        (element.shadowRoot!.querySelector("textarea") as HTMLTextAreaElement).value.includes(
          "![image](https://i.ibb.co/attr/pic.png)"
        )
      );

      expect(imgbbCalls[0]).toBe(
        "https://api.imgbb.com/1/upload?key=client-key"
      );
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("uploads an image pasted from the clipboard and inserts markdown", async () => {
    const element = mount("widget-paste");
    await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);

    const uploads: Blob[] = [];
    element.setMediaProvider({
      upload: async (file) => {
        uploads.push(file);
        return { url: "https://i.ibb.co/paste/pic.png" };
      },
    });

    const textarea = element.shadowRoot!.querySelector("textarea")!;
    textarea.value = "Pasted: ";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await element.updateComplete;

    const file = new File(["bytes"], "clip.png", { type: "image/png" });
    const paste = pasteInto(element, {
      items: [{ kind: "file", type: "image/png", getAsFile: () => file }],
      files: [file],
    });

    await waitFor(() =>
      (element.shadowRoot!.querySelector("textarea") as HTMLTextAreaElement).value.includes(
        "![image](https://i.ibb.co/paste/pic.png)"
      )
    );

    expect(uploads).toHaveLength(1);
    expect(paste.defaultPrevented).toBe(true);
  });

  it("does not intercept a plain-text paste", async () => {
    const element = mount("widget-paste-text");
    await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);
    element.setMediaProvider({
      upload: async () => ({ url: "https://i.ibb.co/unused.png" }),
    });

    const paste = pasteInto(element, {
      items: [{ kind: "string", type: "text/plain", getAsFile: () => null }],
      files: [],
    });
    await element.updateComplete;

    expect(paste.defaultPrevented).toBe(false);
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

  it("reports a comment through the API and marks it as reported", async () => {
    const element = mount("widget-report");
    await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);

    await postComment(element, "Reportable comment");
    await waitFor(() => {
      const items = element.shadowRoot!.querySelectorAll(".comment");
      return (
        items.length === 1 &&
        items[0].textContent?.includes("Reportable comment")
      );
    });

    const reportButton = element.shadowRoot!.querySelector(
      ".report-button"
    ) as HTMLButtonElement;
    expect(reportButton).not.toBeNull();
    expect(reportButton.textContent?.trim()).toBe("Report");
    reportButton.click();
    await waitFor(
      () => element.shadowRoot?.querySelector(".report-picker") !== null
    );

    const reasonInput = element.shadowRoot!.querySelector(
      ".report-reason-input"
    ) as HTMLTextAreaElement;
    reasonInput.value = "This is abusive";
    reasonInput.dispatchEvent(new Event("input", { bubbles: true }));
    await element.updateComplete;

    const submit = element.shadowRoot!.querySelector(
      ".report-submit"
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    submit.click();

    await waitFor(
      () => element.shadowRoot!.querySelector(".report-picker") === null
    );
    const reportedButton = element.shadowRoot!.querySelector(
      ".report-button"
    ) as HTMLButtonElement;
    expect(reportedButton.textContent?.trim()).toBe("Reported");
    expect(reportedButton.disabled).toBe(true);
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
        "widget-api-base",
        `api-base="/api/comments/v1"`
      );
      await waitFor(
        () => element.shadowRoot?.querySelector(".empty") !== null
      );

      expect(prefixedUrls.length).toBeGreaterThan(0);
      expect(
        prefixedUrls.every((url) => url.includes("/api/comments/v1/"))
      ).toBe(true);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("sources all styling from documented --koe-* tokens", () => {
    const cssText = KoeComments.styles.map((style) => style.cssText).join("\n");
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
    const element = mount("widget-contract");
    await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);

    expect(element.theme).toBe("light");
    expect(element.getAttribute("theme")).toBe("light");
    element.theme = "dark";
    await element.updateComplete;
    expect(element.getAttribute("theme")).toBe("dark");

    for (const part of [
      "root",
      "header",
      "title",
      "composer",
      "composer-shell",
      "textarea",
      "list",
      "empty",
      "empty-title",
      "empty-text",
    ]) {
      expect(
        element.shadowRoot!.querySelector(`[part~="${part}"]`)
      ).not.toBeNull();
    }

    for (const name of ["header", "empty", "footer"]) {
      expect(
        element.shadowRoot!.querySelector(`slot[name="${name}"]`)
      ).not.toBeNull();
    }
  });

  it("removes the built-in theme toggle unless show-theme-toggle is set", async () => {
    const element = mount("widget-toggle-off");
    await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);
    expect(
      element.shadowRoot!.querySelector('[part="theme-toggle"]')
    ).toBeNull();

    document.body.innerHTML = `<koe-comments base-url="${baseUrl}" thread-ref="widget-toggle-on" show-theme-toggle></koe-comments>`;
    const toggled = document.querySelector("koe-comments") as KoeComments;
    await waitFor(() => toggled.shadowRoot?.querySelector(".empty") !== null);

    const toggle = toggled.shadowRoot!.querySelector<HTMLButtonElement>(
      '[part="theme-toggle"]'
    );
    expect(toggle).not.toBeNull();
    toggle!.click();
    await toggled.updateComplete;
    expect(toggled.theme).toBe("dark");
  });

  it("instruments rendered comments with part hooks", async () => {
    const element = mount("widget-contract-comment");
    await waitFor(() => element.shadowRoot?.querySelector(".empty") !== null);

    await postComment(element, "Contract comment");
    await waitFor(() => {
      const items = element.shadowRoot!.querySelectorAll(".comment");
      return (
        items.length === 1 &&
        items[0].textContent?.includes("Contract comment")
      );
    });

    for (const part of [
      "comment",
      "avatar",
      "author",
      "time",
      "body",
      "actions",
      "vote-controls",
      "vote-score",
      "add-reaction",
      "report-button",
      "reply-button",
    ]) {
      expect(
        element.shadowRoot!.querySelector(`[part~="${part}"]`)
      ).not.toBeNull();
    }
  });
});
