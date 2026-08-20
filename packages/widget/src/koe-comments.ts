import { CommentNode, createKoeClient, KoeClient } from "@koe/sdk";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

const ACCESS_TOKEN_KEY = "koe_access_token";

@customElement("koe-comments")
export class KoeComments extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: var(--koe-font, system-ui, sans-serif);
      color: var(--koe-text, #1a1a1a);
    }

    .koe-comments {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .composer {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    textarea {
      resize: vertical;
      padding: 8px;
      border: 1px solid var(--koe-border, #ccc);
      border-radius: 4px;
      font: inherit;
    }

    button {
      align-self: flex-start;
      padding: 6px 14px;
      border: none;
      border-radius: 4px;
      background: var(--koe-accent, #2563eb);
      color: #fff;
      font: inherit;
      cursor: pointer;
    }

    button:disabled {
      opacity: 0.5;
      cursor: default;
    }

    .comment-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .comment-list--nested {
      margin-top: 10px;
      margin-left: 24px;
      padding-left: 12px;
      border-left: 1px solid var(--koe-border, #ddd);
    }

    .comment {
      padding: 10px;
      border: 1px solid var(--koe-border, #ddd);
      border-radius: 6px;
      background: var(--koe-surface, #fafafa);
    }

    .comment-body {
      margin: 0 0 6px;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .comment-meta {
      margin: 0;
      font-size: 0.8em;
      color: var(--koe-muted, #666);
    }

    .comment-meta .pending-badge {
      display: inline-block;
      margin-right: 6px;
      padding: 1px 6px;
      border-radius: 999px;
      font-size: 0.75em;
      color: var(--koe-pending-text, #92400e);
      background: var(--koe-pending, #fef3c7);
    }

    .reply-button {
      margin-top: 4px;
      padding: 2px 10px;
      border: 1px solid var(--koe-border, #ccc);
      border-radius: 4px;
      background: transparent;
      color: var(--koe-text, #1a1a1a);
      font: inherit;
      font-size: 0.8em;
      cursor: pointer;
    }

    .reply-target {
      margin: 0;
      font-size: 0.8em;
      color: var(--koe-muted, #666);
    }

    .error {
      color: var(--koe-error, #b91c1c);
    }

    .status,
    .empty {
      color: var(--koe-muted, #666);
    }
  `;

  @property({ type: String, attribute: "base-url" })
  baseUrl = "";

  @property({ type: String, attribute: "thread-ref" })
  threadRef = "";

  @state() private comments: CommentNode[] = [];
  @state() private threadId = "";
  @state() private loading = true;
  @state() private submitting = false;
  @state() private draft = "";
  @state() private replyTo: string | null = null;
  @state() private error = "";

  private client: KoeClient | null = null;
  private token = "";

  connectedCallback() {
    super.connectedCallback();
    if (this.baseUrl && this.threadRef) {
      this.client = createKoeClient({ baseUrl: this.baseUrl });
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
    const list = await this.client!.comments.list(this.threadId);
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

  protected render() {
    return html`
      <section class="koe-comments">
        <h3>Comments</h3>
        ${this.error
          ? html`<p class="error" role="alert">${this.error}</p>`
          : ""}
        <form class="composer" @submit=${this.handleSubmit}>
          ${this.replyTo
            ? html`<p class="reply-target">
                Replying to a comment
                <button type="button" @click=${this.cancelReply}>
                  Cancel
                </button>
              </p>`
            : ""}
          <textarea
            rows="3"
            placeholder="Write a comment..."
            .value=${this.draft}
            @input=${this.handleInput}
          ></textarea>
          <button
            type="submit"
            ?disabled=${this.submitting || !this.draft.trim()}
          >
            ${this.submitting
              ? "Posting..."
              : this.replyTo
                ? "Post reply"
                : "Post comment"}
          </button>
        </form>
        ${this.loading
          ? html`<p class="status">Loading comments...</p>`
          : html`
              <ul class="comment-list">
                ${this.comments.map((comment) =>
                  this.renderComment(comment)
                )}
              </ul>
              ${this.comments.length === 0
                ? html`<p class="empty">No comments yet. Be the first!</p>`
                : ""}
            `}
      </section>
    `;
  }

  private renderComment(comment: CommentNode): TemplateResult {
    return html`
      <li class="comment">
        <div class="comment-body">${unsafeHTML(comment.bodyHtml)}</div>
        <p class="comment-meta">
          ${comment.status === "pending"
            ? html`<span class="pending-badge">Pending</span>`
            : ""}
          Guest · ${new Date(comment.createdAt).toLocaleString()}
        </p>
        <button
          type="button"
          class="reply-button"
          @click=${() => this.startReply(comment.id)}
        >
          Reply
        </button>
        ${comment.children.length > 0
          ? html`
              <ul class="comment-list comment-list--nested">
                ${comment.children.map((child) =>
                  this.renderComment(child)
                )}
              </ul>
            `
          : ""}
      </li>
    `;
  }
}