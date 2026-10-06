import {
  CommentNode,
  createImgbbMediaProvider,
  createKoeClient,
  DEFAULT_EMOJI_ALLOWLIST,
  KoeApiError,
  KoeClient,
  MediaProvider,
} from "@koe/sdk";
import { html, LitElement, nothing, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { tailwindStyles } from "./generated/tailwind.styles.js";

const ACCESS_TOKEN_KEY = "koe_access_token";
const THEME_KEY = "koe_theme";
const COMPOSER_SCOPE = "composer";
const MAX_VISIBLE_REACTIONS = 3;

const AVATAR_EMOJIS = [
  "🦊",
  "🐼",
  "🐨",
  "🦁",
  "🐸",
  "🐙",
  "🦉",
  "🐯",
  "🐵",
  "🐰",
  "🐹",
  "🐳",
  "🐢",
  "🐧",
  "🦄",
  "🐝",
];

interface GiphyImage {
  url?: string;
}

interface GiphyResponse {
  data?: Array<{ images?: Record<string, GiphyImage | undefined> }>;
}

interface ComposerOptions {
  scope: string;
  placeholder: string;
  rows: number;
  draft: string;
  submitting: boolean;
  submitLabel: string;
  postingLabel: string;
  onInput: (e: Event) => void;
  onSubmit: (e: SubmitEvent) => void;
  onCancel?: () => void;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function avatarEmoji(id: string): string {
  return AVATAR_EMOJIS[hashString(id) % AVATAR_EMOJIS.length];
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const ICON_PATHS = {
  quote:
    "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z",
  code: "M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5",
  link: "M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244",
  image:
    "m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Zm10.5-11.25h.008v.008H16.5V9Z",
  upload:
    "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 7.5m0 0L7.5 12m4.5-4.5V21",
  smile:
    "M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.25 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Z",
  chevronUp: "m4.5 15.75 7.5-7.5 7.5 7.5",
  chevronDown: "m19.5 8.25-7.5 7.5-7.5-7.5",
  reply: "M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 6 6v3",
  sun: "M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z",
  moon: "M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z",
  close: "M6 18 18 6M6 6l12 12",
  alert:
    "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
};

@customElement("koe-comments")
export class KoeComments extends LitElement {
  static styles = [tailwindStyles];

  @property({ type: String, attribute: "base-url" })
  baseUrl = "";

  @property({ type: String, attribute: "thread-ref" })
  threadRef = "";

  @property({ type: String, attribute: "reaction-emojis" })
  reactionEmojis = "";

  @property({ type: String, attribute: "gif-api-key" })
  gifApiKey = "";

  @property({ type: String, attribute: "media-api-key" })
  mediaApiKey = "";

  @state() private comments: CommentNode[] = [];
  @state() private threadId = "";
  @state() private loading = true;
  @state() private submitting = false;
  @state() private submittingReply = false;
  @state() private voting = false;
  @state() private reacting = false;
  @state() private draft = "";
  @state() private replyDraft = "";
  @state() private replyTo: string | null = null;
  @state() private expandedReactions: Set<string> = new Set();
  @state() private collapsedThreads: Set<string> = new Set();
  @state() private openReactionPicker: string | null = null;
  @state() private error = "";
  @state() private theme: "light" | "dark" = "light";
  @state() private activeScope: string | null = null;
  @state() private openGifPicker: string | null = null;
  @state() private gifQuery = "";
  @state() private gifResults: string[] = [];
  @state() private gifLoading = false;
  @state() private gifError = "";
  @state() private gifUrl = "";
  @state() private uploadingScope: string | null = null;

  private client: KoeClient | null = null;
  private token = "";
  private mediaProvider: MediaProvider | null = null;
  private gifDebounce: number | undefined;
  private gifAbort: AbortController | null = null;

  private get emojis(): string[] {
    return this.reactionEmojis
      ? this.reactionEmojis
          .split(",")
          .map((emoji) => emoji.trim())
          .filter(Boolean)
      : DEFAULT_EMOJI_ALLOWLIST;
  }

  connectedCallback() {
    super.connectedCallback();
    this.initTheme();
    window.addEventListener("koe-theme-change", this.handleExternalThemeChange);
    if (this.threadRef) {
      const effectiveBaseUrl =
        this.baseUrl ||
        (typeof window !== "undefined" ? window.location.origin : "");
      this.client = createKoeClient({ baseUrl: effectiveBaseUrl });
      void this.loadThread();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(
      "koe-theme-change",
      this.handleExternalThemeChange
    );
    window.clearTimeout(this.gifDebounce);
    this.gifAbort?.abort();
  }

  protected willUpdate(changed: PropertyValues) {
    if (changed.has("mediaApiKey")) {
      this.mediaProvider = this.mediaApiKey
        ? createImgbbMediaProvider({ apiKey: this.mediaApiKey })
        : null;
    }
  }

  private handleExternalThemeChange = (e: Event) => {
    const theme = (e as CustomEvent<{ theme?: string }>).detail?.theme;
    if (theme === "light" || theme === "dark") {
      this.theme = theme;
    }
  };

  private initTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") {
      this.theme = stored;
      return;
    }
    const prefersDark =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    this.theme = prefersDark ? "dark" : "light";
  }

  setTheme(theme: "light" | "dark") {
    this.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    window.dispatchEvent(
      new CustomEvent("koe-theme-change", { detail: { theme } })
    );
  }

  private toggleTheme() {
    this.setTheme(this.theme === "dark" ? "light" : "dark");
  }

  setMediaProvider(provider: MediaProvider | null) {
    this.mediaProvider = provider;
    this.requestUpdate();
  }

  private async loadThread() {
    this.loading = true;
    this.error = "";
    try {
      await this.ensureGuest();
      const thread = await this.client!.threads.getByRef(this.threadRef);
      this.threadId = thread.id;
      await this.reloadComments();
    } catch (err) {
      this.error =
        err instanceof Error ? err.message : "Failed to load comments";
    } finally {
      this.loading = false;
    }
  }

  private async ensureGuest() {
    const stored = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (stored) {
      try {
        await this.client!.auth.me(stored);
        this.token = stored;
        return;
      } catch {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
      }
    }
    const response = await this.client!.auth.anonymous();
    this.token = response.accessToken;
    localStorage.setItem(ACCESS_TOKEN_KEY, this.token);
  }

  private async withAuthRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (err) {
      if (err instanceof KoeApiError && err.status === 401) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        this.token = "";
        await this.ensureGuest();
        return await operation();
      }
      throw err;
    }
  }

  private async reloadComments() {
    if (!this.threadId) {
      return;
    }
    const list = await this.client!.comments.list(
      this.threadId,
      undefined,
      this.token
    );
    this.comments = list.comments;
  }

  private countAll(comments: CommentNode[]): number {
    return comments.reduce((sum, c) => sum + 1 + this.countAll(c.children), 0);
  }

  private draftFor(scope: string): string {
    return scope === COMPOSER_SCOPE ? this.draft : this.replyDraft;
  }

  private setDraft(scope: string, value: string) {
    if (scope === COMPOSER_SCOPE) {
      this.draft = value;
    } else {
      this.replyDraft = value;
    }
  }

  private textareaFor(scope: string): HTMLTextAreaElement | null {
    return this.renderRoot.querySelector<HTMLTextAreaElement>(
      `textarea[data-scope="${scope}"]`
    );
  }

  private handleComposerFocus(scope: string) {
    this.activeScope = scope;
  }

  private handleComposerBlur(e: FocusEvent) {
    const next = e.relatedTarget as Node | null;
    if (next && this.renderRoot.contains(next)) {
      return;
    }
    const scope = this.activeScope;
    if (
      scope &&
      !this.draftFor(scope).trim() &&
      this.openGifPicker !== scope &&
      this.uploadingScope !== scope
    ) {
      this.activeScope = null;
    }
  }

  private isActive(scope: string): boolean {
    return (
      this.activeScope === scope ||
      this.draftFor(scope).trim() !== "" ||
      this.openGifPicker === scope ||
      this.uploadingScope === scope
    );
  }

  private async wrapSelection(
    scope: string,
    prefix: string,
    suffix: string,
    placeholder: string
  ) {
    const textarea = this.textareaFor(scope);
    if (!textarea) {
      return;
    }
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const selected = textarea.value.slice(start, end);
    const inner = selected || placeholder;
    const inserted = prefix + inner + suffix;
    this.setDraft(
      scope,
      textarea.value.slice(0, start) + inserted + textarea.value.slice(end)
    );
    await this.updateComplete;
    const updated = this.textareaFor(scope);
    if (!updated) {
      return;
    }
    updated.focus();
    updated.setSelectionRange(start + prefix.length, start + prefix.length + inner.length);
  }

  private async insertLink(scope: string) {
    const textarea = this.textareaFor(scope);
    if (!textarea) {
      return;
    }
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const selected = textarea.value.slice(start, end);
    const inner = selected || "text";
    const inserted = `[${inner}](url)`;
    this.setDraft(
      scope,
      textarea.value.slice(0, start) + inserted + textarea.value.slice(end)
    );
    await this.updateComplete;
    const updated = this.textareaFor(scope);
    if (!updated) {
      return;
    }
    const urlStart = start + inner.length + 3;
    updated.focus();
    updated.setSelectionRange(urlStart, urlStart + 3);
  }

  private async insertText(scope: string, text: string) {
    const textarea = this.textareaFor(scope);
    if (!textarea) {
      return;
    }
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    this.setDraft(
      scope,
      textarea.value.slice(0, start) + text + textarea.value.slice(end)
    );
    await this.updateComplete;
    const updated = this.textareaFor(scope);
    if (!updated) {
      return;
    }
    updated.focus();
    updated.setSelectionRange(start + text.length, start + text.length);
  }

  private openGifPickerFor(scope: string) {
    this.openGifPicker = scope;
    this.gifQuery = "";
    this.gifResults = [];
    this.gifError = "";
    this.gifUrl = "";
    if (this.gifApiKey) {
      void this.loadGifs("");
    }
  }

  private closeGifPicker() {
    this.openGifPicker = null;
    this.gifQuery = "";
    this.gifResults = [];
    this.gifError = "";
    this.gifUrl = "";
  }

  private async loadGifs(query: string) {
    if (!this.gifApiKey) {
      return;
    }
    this.gifAbort?.abort();
    const controller = new AbortController();
    this.gifAbort = controller;
    this.gifLoading = true;
    this.gifError = "";
    try {
      const params = new URLSearchParams({
        api_key: this.gifApiKey,
        limit: "12",
        rating: "pg",
      });
      const endpoint = query
        ? "https://api.giphy.com/v1/gifs/search"
        : "https://api.giphy.com/v1/gifs/trending";
      if (query) {
        params.set("q", query);
      }
      const response = await fetch(`${endpoint}?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Giphy request failed (${response.status})`);
      }
      const payload = (await response.json()) as GiphyResponse;
      this.gifResults = (payload.data ?? [])
        .map(
          (gif) =>
            gif.images?.downsized_medium?.url ??
            gif.images?.original?.url ??
            ""
        )
        .filter(Boolean);
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      this.gifError = err instanceof Error ? err.message : "Failed to load GIFs";
    } finally {
      if (!controller.signal.aborted) {
        this.gifLoading = false;
      }
    }
  }

  private handleGifSearchInput(value: string) {
    this.gifQuery = value;
    window.clearTimeout(this.gifDebounce);
    this.gifDebounce = window.setTimeout(() => {
      void this.loadGifs(value);
    }, 300);
  }

  private async insertGif(scope: string, url: string) {
    await this.insertText(scope, `![image](${url})`);
    this.closeGifPicker();
  }

  private async insertCustomGif(scope: string) {
    const url = this.gifUrl.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      this.gifError = "Enter a valid http(s) image URL";
      return;
    }
    await this.insertGif(scope, url);
  }

  private openMediaPicker(scope: string) {
    const input = Array.from(
      this.renderRoot.querySelectorAll<HTMLInputElement>(
        "input[data-media-scope]"
      )
    ).find((el) => el.dataset.mediaScope === scope);
    input?.click();
  }

  private async handleMediaSelected(scope: string, e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) {
      return;
    }
    if (!this.mediaProvider) {
      this.error = "Image upload is not configured";
      return;
    }
    this.uploadingScope = scope;
    this.error = "";
    try {
      const { url } = await this.mediaProvider.upload(file);
      await this.insertText(scope, `![image](${url})`);
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Failed to upload image";
    } finally {
      this.uploadingScope = null;
    }
  }

  private handleInput(e: Event) {
    this.draft = (e.target as HTMLTextAreaElement).value;
  }

  private handleReplyInput(e: Event) {
    this.replyDraft = (e.target as HTMLTextAreaElement).value;
  }

  private async submitComment(body: string, parentId?: string) {
    await this.withAuthRetry(() =>
      this.client!.comments.create(
        this.threadId,
        {
          bodyMd: body,
          ...(parentId ? { parentId } : {}),
        },
        this.token
      )
    );
    await this.reloadComments();
  }

  private async handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const body = this.draft.trim();
    if (!body || !this.threadId || this.submitting) {
      return;
    }
    this.submitting = true;
    this.error = "";
    try {
      await this.submitComment(body);
      this.draft = "";
      if (this.openGifPicker === COMPOSER_SCOPE) {
        this.closeGifPicker();
      }
    } catch (err) {
      this.error =
        err instanceof Error ? err.message : "Failed to post comment";
    } finally {
      this.submitting = false;
    }
  }

  private async handleReplySubmit(e: SubmitEvent) {
    e.preventDefault();
    const body = this.replyDraft.trim();
    if (!body || !this.threadId || !this.replyTo || this.submittingReply) {
      return;
    }
    this.submittingReply = true;
    this.error = "";
    try {
      await this.submitComment(body, this.replyTo);
      this.replyDraft = "";
      this.replyTo = null;
      this.closeGifPicker();
    } catch (err) {
      this.error =
        err instanceof Error ? err.message : "Failed to post reply";
    } finally {
      this.submittingReply = false;
    }
  }

  private startReply(commentId: string) {
    this.replyTo = commentId;
    this.replyDraft = "";
    this.openGifPicker = null;
  }

  private cancelReply() {
    if (this.replyTo && this.openGifPicker === this.replyTo) {
      this.closeGifPicker();
    }
    this.replyTo = null;
    this.replyDraft = "";
  }

  private emojiIndex(emoji: string): number {
    const index = this.emojis.indexOf(emoji);
    return index === -1 ? this.emojis.length : index;
  }

  private visibleReactions(comment: CommentNode): [string, number][] {
    return Object.entries(comment.reactionTotals ?? {})
      .filter(([, count]) => count > 0)
      .sort(
        (a, b) =>
          b[1] - a[1] || this.emojiIndex(a[0]) - this.emojiIndex(b[0])
      );
  }

  private toggleThread(commentId: string) {
    const next = new Set(this.collapsedThreads);
    if (next.has(commentId)) {
      next.delete(commentId);
    } else {
      next.add(commentId);
    }
    this.collapsedThreads = next;
  }

  private toggleReactions(commentId: string) {
    const next = new Set(this.expandedReactions);
    if (next.has(commentId)) {
      next.delete(commentId);
    } else {
      next.add(commentId);
    }
    this.expandedReactions = next;
  }

  private toggleReactionPicker(commentId: string) {
    this.openReactionPicker =
      this.openReactionPicker === commentId ? null : commentId;
  }

  private async voteComment(commentId: string, value: 1 | -1) {
    if (!this.threadId || this.voting) {
      return;
    }
    this.voting = true;
    this.error = "";
    try {
      await this.withAuthRetry(() =>
        this.client!.comments.vote(commentId, value, this.token)
      );
      await this.reloadComments();
    } catch (err) {
      this.error =
        err instanceof Error ? err.message : "Failed to vote";
    } finally {
      this.voting = false;
    }
  }

  private async reactToComment(commentId: string, emoji: string) {
    if (!this.threadId || this.reacting) {
      return;
    }
    this.reacting = true;
    this.error = "";
    try {
      await this.withAuthRetry(() =>
        this.client!.comments.react(commentId, emoji, this.token)
      );
      this.openReactionPicker = null;
      await this.reloadComments();
    } catch (err) {
      this.error =
        err instanceof Error ? err.message : "Failed to react";
    } finally {
      this.reacting = false;
    }
  }

  private icon(path: string, extraClass = ""): TemplateResult {
    return html`<svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      class="h-4 w-4 ${extraClass}"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d=${path} />
    </svg>`;
  }

  private avatar(seed: string, composer = false): TemplateResult {
    const emoji = composer ? "🙂" : avatarEmoji(seed);
    return html`
      <div
        class="koe-avatar flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-200 text-lg leading-none shadow-sm dark:border-slate-700 dark:from-slate-800 dark:to-slate-700"
        aria-hidden="true"
      >
        <span>${emoji}</span>
      </div>
    `;
  }

  protected render() {
    const total = this.countAll(this.comments);
    return html`
      <section
        class="koe-comments font-sans antialiased ${this.theme === "dark"
          ? "dark"
          : ""}"
        style="color-scheme: ${this.theme};"
      >
        <div class="mb-5 flex items-center justify-between gap-3">
          <h3
            class="flex items-baseline gap-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white"
          >
            Comments
            ${total > 0
              ? html`<span
                  class="text-sm font-medium text-slate-400 dark:text-slate-500"
                >
                  ${total}
                </span>`
              : nothing}
          </h3>
          <button
            type="button"
            class="theme-toggle inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:rotate-12 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            aria-label=${this.theme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"}
            title=${this.theme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"}
            @click=${this.toggleTheme}
          >
            ${this.icon(this.theme === "dark" ? ICON_PATHS.sun : ICON_PATHS.moon, "h-[18px] w-[18px]")}
          </button>
        </div>

        ${this.error
          ? html`<p
              class="error pop-in mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
              role="alert"
            >
              ${this.icon(ICON_PATHS.alert, "h-4 w-4 shrink-0")}
              <span>${this.error}</span>
            </p>`
          : nothing}

        <form class="composer mb-8" @submit=${this.handleSubmit}>
          ${this.renderComposer({
            scope: COMPOSER_SCOPE,
            placeholder: "What are your thoughts?",
            rows: 3,
            draft: this.draft,
            submitting: this.submitting,
            submitLabel: "Comment",
            postingLabel: "Posting...",
            onInput: this.handleInput,
            onSubmit: this.handleSubmit,
          })}
        </form>

        ${this.loading ? this.renderLoading() : this.renderCommentList()}
      </section>
    `;
  }

  private renderLoading(): TemplateResult {
    return html`
      <div class="space-y-5" aria-busy="true">
        ${[1, 2, 3].map(
          () => html`
            <div class="flex animate-pulse gap-3">
              <div
                class="h-8 w-8 shrink-0 rounded-full bg-slate-200 dark:bg-slate-800"
              ></div>
              <div class="flex-1 space-y-2 py-1">
                <div
                  class="h-3 w-1/4 rounded-full bg-slate-200 dark:bg-slate-800"
                ></div>
                <div
                  class="h-3 w-3/4 rounded-full bg-slate-200 dark:bg-slate-800"
                ></div>
              </div>
            </div>
          `
        )}
      </div>
    `;
  }

  private renderCommentList(): TemplateResult {
    return html`
      <ul class="comment-list comment-list--root">
        ${this.comments.map((comment) => this.renderComment(comment))}
      </ul>
      ${this.comments.length === 0
        ? html`
            <div
              class="empty rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700"
            >
              <div class="mb-3 text-3xl" aria-hidden="true">💬</div>
              <p
                class="text-sm font-semibold text-slate-600 dark:text-slate-300"
              >
                No comments yet
              </p>
              <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Be the first to share your thoughts.
              </p>
            </div>
          `
        : nothing}
    `;
  }

  private renderComposer(options: ComposerOptions): TemplateResult {
    const { scope } = options;
    const active = this.isActive(scope);
    return html`
      <div class="flex gap-3">
        ${this.avatar("composer", true)}
        <div
          class="composer-shell relative min-w-0 flex-1 rounded-2xl border bg-white transition-all duration-200 dark:bg-slate-900 ${active
            ? "border-slate-300 shadow-sm ring-4 ring-slate-900/5 dark:border-slate-600 dark:ring-white/5"
            : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"}"
        >
          <input
            type="file"
            accept="image/*"
            class="hidden"
            data-media-scope=${scope}
            @change=${(e: Event) => this.handleMediaSelected(scope, e)}
          />
          ${active ? this.renderToolbar(scope) : nothing}
          <textarea
            rows=${options.rows}
            data-scope=${scope}
            placeholder=${options.placeholder}
            class="block w-full resize-y border-0 bg-transparent px-4 py-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
            .value=${options.draft}
            @input=${options.onInput}
            @focus=${() => this.handleComposerFocus(scope)}
            @blur=${this.handleComposerBlur}
          ></textarea>
          ${active
            ? html`
                <div
                  class="flex items-center justify-between gap-2 px-3 pb-3 pt-1"
                >
                  <span
                    class="hidden text-xs text-slate-400 sm:inline dark:text-slate-500"
                  >
                    Markdown supported
                  </span>
                  <div class="flex items-center gap-2">
                    ${options.onCancel
                      ? html`
                          <button
                            type="button"
                            class="rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            @click=${options.onCancel}
                          >
                            Cancel
                          </button>
                        `
                      : nothing}
                    <button
                      type="submit"
                      class="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 dark:focus-visible:ring-white/40"
                      ?disabled=${options.submitting || !options.draft.trim()}
                    >
                      ${options.submitting
                        ? options.postingLabel
                        : options.submitLabel}
                    </button>
                  </div>
                </div>
              `
            : nothing}
          ${this.openGifPicker === scope ? this.renderGifPicker(scope) : nothing}
        </div>
      </div>
    `;
  }

  private renderToolbar(scope: string): TemplateResult {
    const preventFocus = (e: Event) => e.preventDefault();
    return html`
      <div
        class="composer-toolbar flex flex-wrap items-center gap-0.5 border-b border-slate-100 px-2 py-1.5 dark:border-slate-800"
      >
        <button
          type="button"
          class="toolbar-button"
          aria-label="Bold"
          title="Bold"
          @mousedown=${preventFocus}
          @click=${() => this.wrapSelection(scope, "**", "**", "bold text")}
        >
          <span class="text-sm font-extrabold">B</span>
        </button>
        <button
          type="button"
          class="toolbar-button"
          aria-label="Italic"
          title="Italic"
          @mousedown=${preventFocus}
          @click=${() => this.wrapSelection(scope, "*", "*", "italic text")}
        >
          <span class="font-serif text-sm italic">I</span>
        </button>
        <button
          type="button"
          class="toolbar-button"
          aria-label="Strikethrough"
          title="Strikethrough"
          @mousedown=${preventFocus}
          @click=${() =>
            this.wrapSelection(scope, "~~", "~~", "struck text")}
        >
          <span class="text-sm line-through">S</span>
        </button>
        <span
          class="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700"
          aria-hidden="true"
        ></span>
        <button
          type="button"
          class="toolbar-button"
          aria-label="Quote"
          title="Quote"
          @mousedown=${preventFocus}
          @click=${() => this.wrapSelection(scope, "> ", "", "quoted text")}
        >
          ${this.icon(ICON_PATHS.quote)}
        </button>
        <button
          type="button"
          class="toolbar-button"
          aria-label="Code"
          title="Code"
          @mousedown=${preventFocus}
          @click=${() => this.wrapSelection(scope, "`", "`", "code")}
        >
          ${this.icon(ICON_PATHS.code)}
        </button>
        <button
          type="button"
          class="toolbar-button"
          aria-label="Link"
          title="Link"
          @mousedown=${preventFocus}
          @click=${() => this.insertLink(scope)}
        >
          ${this.icon(ICON_PATHS.link)}
        </button>
        <span
          class="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700"
          aria-hidden="true"
        ></span>
        <button
          type="button"
          class="gif-button flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 ${this
            .openGifPicker === scope
            ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
            : ""}"
          aria-label="Insert image or GIF"
          title="Insert image or GIF"
          @mousedown=${preventFocus}
          @click=${() =>
            this.openGifPicker === scope
              ? this.closeGifPicker()
              : this.openGifPickerFor(scope)}
        >
          ${this.icon(ICON_PATHS.image)}
          <span
            class="rounded bg-gradient-to-r from-fuchsia-500 to-pink-500 px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white"
          >
            GIF
          </span>
        </button>
        ${this.mediaProvider
          ? html`
              <button
                type="button"
                class="media-upload-button flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="Upload image"
                title=${this.uploadingScope === scope
                  ? "Uploading..."
                  : "Upload image"}
                ?disabled=${this.uploadingScope === scope}
                @mousedown=${preventFocus}
                @click=${() => this.openMediaPicker(scope)}
              >
                ${this.icon(
                  this.uploadingScope === scope
                    ? ICON_PATHS.image
                    : ICON_PATHS.upload
                )}
              </button>
            `
          : nothing}
      </div>
    `;
  }

  private renderGifPicker(scope: string): TemplateResult {
    return html`
      <div
        class="gif-picker pop-in absolute right-2 top-full z-20 mt-2 w-80 max-w-[calc(100vw-4rem)] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95"
      >
        <div class="mb-2 flex items-center justify-between">
          <span
            class="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
          >
            Image / GIF
          </span>
          <button
            type="button"
            class="toolbar-button !h-6 !w-6"
            aria-label="Close image picker"
            @click=${this.closeGifPicker}
          >
            ${this.icon(ICON_PATHS.close)}
          </button>
        </div>
        ${this.gifApiKey
          ? html`
              <input
                type="text"
                class="mb-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500"
                placeholder="Search Giphy..."
                .value=${this.gifQuery}
                @input=${(e: Event) =>
                  this.handleGifSearchInput(
                    (e.target as HTMLInputElement).value
                  )}
              />
              <div
                class="gif-grid mb-2 grid max-h-56 grid-cols-3 gap-2 overflow-y-auto"
              >
                ${this.gifLoading
                  ? html`<p
                      class="col-span-3 py-6 text-center text-xs text-slate-400"
                    >
                      Loading GIFs...
                    </p>`
                  : this.gifError
                    ? html`<p
                        class="col-span-3 py-6 text-center text-xs text-red-500"
                      >
                        ${this.gifError}
                      </p>`
                    : this.gifResults.length === 0
                      ? html`<p
                          class="col-span-3 py-6 text-center text-xs text-slate-400"
                        >
                          No GIFs found.
                        </p>`
                      : this.gifResults.map(
                          (url) => html`<img
                            src=${url}
                            alt="GIF option"
                            loading="lazy"
                            class="h-20 w-full cursor-pointer rounded-lg bg-slate-100 object-cover transition-opacity hover:opacity-75 dark:bg-slate-800"
                            @click=${() => this.insertGif(scope, url)}
                          />`
                        )}
              </div>
            `
          : html`<p class="mb-2 text-xs text-slate-400 dark:text-slate-500">
              Paste an image URL below, or set the
              <code class="font-mono">gif-api-key</code> attribute to search
              Giphy.
            </p>`}
        <div class="flex gap-2">
          <input
            type="text"
            class="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500"
            placeholder="https://example.com/image.gif"
            .value=${this.gifUrl}
            @input=${(e: Event) =>
              (this.gifUrl = (e.target as HTMLInputElement).value)}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                void this.insertCustomGif(scope);
              }
            }}
          />
          <button
            type="button"
            class="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            ?disabled=${!this.gifUrl.trim()}
            @click=${() => void this.insertCustomGif(scope)}
          >
            Insert
          </button>
        </div>
        ${this.gifError && this.gifApiKey
          ? nothing
          : this.gifError
            ? html`<p class="mt-1.5 text-xs text-red-500">${this.gifError}</p>`
            : nothing}
      </div>
    `;
  }

  private renderComment(comment: CommentNode, depth = 0): TemplateResult {
    const createdAt = new Date(comment.createdAt);
    const reactions = this.visibleReactions(comment);
    const expanded = this.expandedReactions.has(comment.id);
    const shown = expanded ? reactions : reactions.slice(0, MAX_VISIBLE_REACTIONS);
    const hiddenCount = reactions.length - MAX_VISIBLE_REACTIONS;
    const canToggle = reactions.length > MAX_VISIBLE_REACTIONS;
    const collapsed = this.collapsedThreads.has(comment.id);
    const childCount = comment.children.length;
    return html`
      <li class="comment">
        <div class="flex gap-3">
          ${this.avatar(comment.authorId)}
          <div class="min-w-0 flex-1">
            <div class="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span
                class="text-sm font-semibold text-slate-900 dark:text-white"
              >
                Guest
              </span>
              <span class="text-slate-300 dark:text-slate-600" aria-hidden="true"
                >·</span
              >
              <time
                class="comment-time text-xs text-slate-400 dark:text-slate-500"
                datetime=${createdAt.toISOString()}
                title=${createdAt.toLocaleString()}
              >
                ${formatRelativeTime(createdAt)}
              </time>
              ${comment.status === "pending"
                ? html`<span class="pending-badge">Pending approval</span>`
                : nothing}
            </div>
            <div
              class="comment-body prose prose-sm prose-slate max-w-none dark:prose-invert"
            >${unsafeHTML(comment.bodyHtml)}</div>

            <div class="comment-actions mt-2.5 flex flex-wrap items-center gap-2">
              <div
                class="vote-controls inline-flex items-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-700"
              >
                <button
                  type="button"
                  class="vote-button flex h-8 w-8 items-center justify-center text-slate-400 transition-colors hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-blue-400 ${comment.userVote ===
                  1
                    ? "active up"
                    : ""}"
                  ?disabled=${this.voting}
                  @click=${() => this.voteComment(comment.id, 1)}
                  aria-label="Upvote"
                >
                  ${this.icon(ICON_PATHS.chevronUp)}
                </button>
                <span
                  class="vote-score min-w-6 text-center text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300"
                >
                  ${comment.upvotes - comment.downvotes}
                </span>
                <button
                  type="button"
                  class="vote-button flex h-8 w-8 items-center justify-center text-slate-400 transition-colors hover:bg-slate-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-red-400 ${comment.userVote ===
                  -1
                    ? "active down"
                    : ""}"
                  ?disabled=${this.voting}
                  @click=${() => this.voteComment(comment.id, -1)}
                  aria-label="Downvote"
                >
                  ${this.icon(ICON_PATHS.chevronDown)}
                </button>
              </div>

              <div class="reaction-list flex flex-wrap items-center gap-1.5">
                ${shown.map(
                  ([emoji, count]) => {
                    const active =
                      comment.userReactions?.includes(emoji) ?? false;
                    return html`
                      <button
                        type="button"
                        class="reaction-button inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition-colors hover:border-slate-300 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 ${active
                          ? "active"
                          : ""}"
                        ?disabled=${this.reacting}
                        @click=${() => this.reactToComment(comment.id, emoji)}
                        aria-label=${`React with ${emoji}`}
                        aria-pressed=${active}
                      >
                        <span>${emoji}</span>
                        <span
                          class="reaction-count tabular-nums text-slate-400 dark:text-slate-500"
                        >
                          ${count}
                        </span>
                      </button>
                    `;
                  }
                )}
                ${canToggle
                  ? html`
                      <button
                        type="button"
                        class="reactions-toggle inline-flex items-center rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
                        @click=${() => this.toggleReactions(comment.id)}
                      >
                        ${expanded ? "Show fewer" : `+${hiddenCount} more`}
                      </button>
                    `
                  : nothing}
                <button
                  type="button"
                  class="add-reaction-button inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:text-slate-300"
                  aria-label="Add reaction"
                  @click=${() => this.toggleReactionPicker(comment.id)}
                >
                  ${this.icon(ICON_PATHS.smile)}
                </button>
                ${this.openReactionPicker === comment.id
                  ? html`
                      <div
                        class="reaction-picker pop-in inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                      >
                        ${this.emojis.map(
                          (emoji) => html`
                            <button
                              type="button"
                              class="reaction-picker-button flex h-8 w-8 items-center justify-center rounded-lg text-base transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                              aria-label=${`React with ${emoji}`}
                              @click=${() =>
                                this.reactToComment(comment.id, emoji)}
                            >
                              ${emoji}
                            </button>
                          `
                        )}
                      </div>
                    `
                  : nothing}
              </div>

              <button
                type="button"
                class="reply-button ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                @click=${() => this.startReply(comment.id)}
              >
                ${this.icon(ICON_PATHS.reply)}
                Reply
              </button>
            </div>

            ${comment.id === this.replyTo
              ? html`
                  <div class="reply-composer pop-in mt-3">
                    <form
                      @submit=${this.handleReplySubmit}
                    >
                      ${this.renderComposer({
                        scope: comment.id,
                        placeholder: "Reply to this comment...",
                        rows: 2,
                        draft: this.replyDraft,
                        submitting: this.submittingReply,
                        submitLabel: "Reply",
                        postingLabel: "Posting...",
                        onInput: this.handleReplyInput,
                        onSubmit: this.handleReplySubmit,
                        onCancel: () => this.cancelReply(),
                      })}
                    </form>
                  </div>
                `
              : nothing}

            ${childCount > 0
              ? html`
                  <button
                    type="button"
                    class="thread-toggle mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    @click=${() => this.toggleThread(comment.id)}
                  >
                    ${this.icon(
                      collapsed ? ICON_PATHS.chevronDown : ICON_PATHS.chevronUp
                    )}
                    ${collapsed
                      ? `Show ${childCount} ${childCount === 1 ? "reply" : "replies"}`
                      : `Hide ${childCount} ${childCount === 1 ? "reply" : "replies"}`}
                  </button>
                  ${collapsed
                    ? nothing
                    : html`
                        <ul
                          class="comment-list comment-list--nested thread-line mt-2 ml-2 space-y-3 pl-4"
                          style="border-color: var(--koe-thread-line-${depth % 4});"
                        >
                          ${comment.children.map((child) =>
                            this.renderComment(child, depth + 1)
                          )}
                        </ul>
                      `}
                `
              : nothing}
          </div>
        </div>
      </li>
    `;
  }
}
