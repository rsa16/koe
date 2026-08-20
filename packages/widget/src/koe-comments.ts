import { CommentNode, createKoeClient, DEFAULT_EMOJI_ALLOWLIST, KoeClient } from "@koe/sdk";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { tailwindStyles } from "./generated/tailwind.styles.js";

const ACCESS_TOKEN_KEY = "koe_access_token";

const AVATAR_COLORS = [
  "#0ea5e9",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

@customElement("koe-comments")
export class KoeComments extends LitElement {
  static styles = [tailwindStyles];

  @property({ type: String, attribute: "base-url" })
  baseUrl = "";

  @property({ type: String, attribute: "thread-ref" })
  threadRef = "";

  @property({ type: String, attribute: "reaction-emojis" })
  reactionEmojis = "";

  @state() private comments: CommentNode[] = [];
  @state() private threadId = "";
  @state() private loading = true;
  @state() private submitting = false;
  @state() private voting = false;
  @state() private reacting = false;
  @state() private draft = "";
  @state() private replyTo: string | null = null;
  @state() private error = "";

  private client: KoeClient | null = null;
  private token = "";

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
    if (this.threadRef) {
      const effectiveBaseUrl = this.baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
      this.client = createKoeClient({ baseUrl: effectiveBaseUrl });
      void this.loadThread();
    }
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
      this.token = stored;
      return;
    }
    const response = await this.client!.auth.anonymous();
    this.token = response.accessToken;
    localStorage.setItem(ACCESS_TOKEN_KEY, this.token);
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

  private handleInput(e: Event) {
    this.draft = (e.target as HTMLTextAreaElement).value;
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
      await this.client!.comments.create(
        this.threadId,
        {
          bodyMd: body,
          ...(this.replyTo ? { parentId: this.replyTo } : {}),
        },
        this.token
      );
      this.draft = "";
      this.replyTo = null;
      await this.reloadComments();
    } catch (err) {
      this.error =
        err instanceof Error ? err.message : "Failed to post comment";
    } finally {
      this.submitting = false;
    }
  }

  private startReply(commentId: string) {
    this.replyTo = commentId;
  }

  private cancelReply() {
    this.replyTo = null;
  }

  private async voteComment(commentId: string, value: 1 | -1) {
    if (!this.threadId || this.voting) {
      return;
    }
    this.voting = true;
    this.error = "";
    try {
      await this.client!.comments.vote(commentId, value, this.token);
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
      await this.client!.comments.react(commentId, emoji, this.token);
      await this.reloadComments();
    } catch (err) {
      this.error =
        err instanceof Error ? err.message : "Failed to react";
    } finally {
      this.reacting = false;
    }
  }

  private avatar(color: string): TemplateResult {
    return html`
      <div
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
        style="background-color: ${color}"
        aria-hidden="true"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="h-5 w-5"
        >
          <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-3.87 0-7 2.58-7 6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2c0-3.42-3.13-6-7-6Z" />
        </svg>
      </div>
    `;
  }

  protected render() {
    return html`
      <section class="koe-comments font-sans">
        <div class="mb-5 border-b border-slate-200 pb-3">
          <h3 class="text-base font-semibold text-slate-900">Comments</h3>
        </div>

        ${this.error
          ? html`<p class="error mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              ${this.error}
            </p>`
          : ""}

        <form class="composer mb-6" @submit=${this.handleSubmit}>
          ${this.replyTo
            ? html`<p class="reply-target mb-2 flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                <span>Replying to a comment</span>
                <button
                  type="button"
                  class="rounded px-2 py-0.5 font-medium text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800"
                  @click=${this.cancelReply}
                >
                  Cancel
                </button>
              </p>`
            : ""}
          <div class="flex gap-3">
            ${this.avatar("#64748b")}
            <div class="min-w-0 flex-1">
              <textarea
                rows="3"
                placeholder="Add a comment..."
                class="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                .value=${this.draft}
                @input=${this.handleInput}
              ></textarea>
              <div class="mt-2 flex justify-end">
                <button
                  type="submit"
                  class="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                  ?disabled=${this.submitting || !this.draft.trim()}
                >
                  ${this.submitting
                    ? "Posting..."
                    : this.replyTo
                      ? "Post reply"
                      : "Post comment"}
                </button>
              </div>
            </div>
          </div>
        </form>

        ${this.loading
          ? html`<p class="status text-sm text-slate-500">Loading comments...</p>`
          : html`
              <ul class="comment-list space-y-4">
                ${this.comments.map((comment) =>
                  this.renderComment(comment)
                )}
              </ul>
              ${this.comments.length === 0
                ? html`<p class="empty text-sm text-slate-500">No comments yet. Be the first!</p>`
                : ""}
            `}
      </section>
    `;
  }

  private renderComment(comment: CommentNode): TemplateResult {
    const createdAt = new Date(comment.createdAt);
    return html`
      <li class="comment flex gap-3">
        ${this.avatar(avatarColor(comment.authorId))}
        <div class="min-w-0 flex-1">
          <div class="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div class="mb-1 flex items-center justify-between gap-2">
              <span class="text-sm font-semibold text-slate-900">Guest</span>
              <div class="flex items-center gap-2 text-xs text-slate-400">
                ${comment.status === "pending"
                  ? html`<span class="pending-badge">Pending approval</span>`
                  : ""}
                <time class="whitespace-nowrap" datetime=${createdAt.toISOString()}>
                  ${createdAt.toLocaleString()}
                </time>
              </div>
            </div>
            <div class="comment-body prose prose-sm prose-slate max-w-none">${unsafeHTML(comment.bodyHtml)}</div>
          </div>

          <div class="mt-2 flex flex-wrap items-center gap-2">
            <div class="vote-controls inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white">
              <button
                type="button"
                class="vote-button flex h-7 w-7 items-center justify-center text-xs text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50 ${comment.userVote === 1 ? "active" : ""}"
                ?disabled=${this.voting}
                @click=${() => this.voteComment(comment.id, 1)}
                aria-label="Upvote"
              >
                ▲
              </button>
              <span class="vote-score flex min-w-8 items-center justify-center px-1 text-xs font-semibold text-slate-600">
                ${comment.upvotes - comment.downvotes}
              </span>
              <button
                type="button"
                class="vote-button flex h-7 w-7 items-center justify-center text-xs text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50 ${comment.userVote === -1 ? "active" : ""}"
                ?disabled=${this.voting}
                @click=${() => this.voteComment(comment.id, -1)}
                aria-label="Downvote"
              >
                ▼
              </button>
            </div>

            <div class="reaction-list flex flex-wrap gap-1.5">
              ${this.emojis.map((emoji) => {
                const count = comment.reactionTotals?.[emoji] ?? 0;
                const active = comment.userReactions?.includes(emoji) ?? false;
                return html`
                  <button
                    type="button"
                    class="reaction-button inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 ${active ? "active" : ""}"
                    ?disabled=${this.reacting}
                    @click=${() => this.reactToComment(comment.id, emoji)}
                    aria-label=${`React with ${emoji}`}
                    aria-pressed=${active}
                  >
                    ${emoji}<span class="reaction-count text-slate-400">${count}</span>
                  </button>
                `;
              })}
            </div>

            <button
              type="button"
              class="reply-button inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              @click=${() => this.startReply(comment.id)}
            >
              Reply
            </button>
          </div>

          ${comment.children.length > 0
            ? html`
                <ul class="comment-list comment-list--nested mt-3 ml-2 space-y-3 border-l-2 border-slate-100 pl-3">
                  ${comment.children.map((child) =>
                    this.renderComment(child)
                  )}
                </ul>
              `
            : ""}
        </div>
      </li>
    `;
  }
}