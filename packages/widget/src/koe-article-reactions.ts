import {
  createKoeClient,
  DEFAULT_EMOJI_ALLOWLIST,
  KoeClient,
} from "@koe/sdk";
import { html, LitElement, nothing, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { tailwindStyles } from "./generated/tailwind.styles.js";
import {
  ACCESS_TOKEN_KEY,
  ensureGuestSession,
  runWithAuthRetry,
} from "./session.js";

@customElement("koe-article-reactions")
export class KoeArticleReactions extends LitElement {
  static styles = [tailwindStyles];

  @property({ type: String, attribute: "base-url" })
  baseUrl = "";

  @property({ type: String, attribute: "thread-ref" })
  threadRef = "";

  @property({ type: String, attribute: "reaction-emojis" })
  reactionEmojis = "";

  @property({ type: String, reflect: true })
  theme: "light" | "dark" = "light";

  @state() private threadId = "";
  @state() private reactionTotals: Record<string, number> = {};
  @state() private userReactions: string[] = [];
  @state() private loading = true;
  @state() private reacting = false;
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
      const effectiveBaseUrl =
        this.baseUrl ||
        (typeof window !== "undefined" ? window.location.origin : "");
      this.client = createKoeClient({ baseUrl: effectiveBaseUrl });
      void this.load();
    }
  }

  private async ensureGuest() {
    this.token = await ensureGuestSession(this.client!, localStorage);
  }

  private async withAuthRetry<T>(operation: () => Promise<T>): Promise<T> {
    return runWithAuthRetry(operation, async () => {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      this.token = "";
      await this.ensureGuest();
    });
  }

  private async load() {
    this.loading = true;
    this.error = "";
    try {
      await this.ensureGuest();
      await this.refresh();
    } catch (err) {
      this.error =
        err instanceof Error ? err.message : "Failed to load reactions";
    } finally {
      this.loading = false;
    }
  }

  private async refresh() {
    const thread = await this.withAuthRetry(() =>
      this.client!.threads.getByRef(this.threadRef, undefined, this.token)
    );
    this.threadId = thread.id;
    this.reactionTotals = thread.reactionTotals ?? {};
    this.userReactions = thread.userReactions ?? [];
  }

  private countFor(emoji: string): number {
    return this.reactionTotals[emoji] ?? 0;
  }

  private isActive(emoji: string): boolean {
    return this.userReactions.includes(emoji);
  }

  private async toggleReaction(emoji: string) {
    if (!this.threadId || this.reacting) {
      return;
    }
    this.reacting = true;
    this.error = "";
    const active = this.isActive(emoji);
    try {
      await this.withAuthRetry(async () => {
        if (active) {
          await this.client!.threads.unreact(this.threadId, emoji, this.token);
        } else {
          await this.client!.threads.react(this.threadId, emoji, this.token);
        }
      });
      await this.refresh();
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Failed to react";
    } finally {
      this.reacting = false;
    }
  }

  protected render() {
    return html`
      <section
        part="root"
        class="koe-article-reactions font-sans antialiased"
        style="color-scheme: ${this.theme};"
      >
        <slot name="label"></slot>
        ${this.error
          ? html`<p
              part="error"
              class="error mb-2 rounded-xl border border-koe-danger-border bg-koe-danger-soft px-3 py-2 text-sm text-koe-danger"
              role="alert"
            >
              ${this.error}
            </p>`
          : nothing}
        ${this.loading ? this.renderLoading() : this.renderReactions()}
        <slot name="footer"></slot>
      </section>
    `;
  }

  private renderLoading(): TemplateResult {
    return html`
      <div part="loading" class="flex gap-1.5" aria-busy="true">
        ${this.emojis.map(
          () => html`
            <div class="h-8 w-16 animate-pulse rounded-full bg-koe-skeleton"></div>
          `
        )}
      </div>
    `;
  }

  private renderReactions(): TemplateResult {
    return html`
      <div
        part="group"
        class="article-reactions inline-flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Article reactions"
      >
        ${this.emojis.map((emoji) => {
          const active = this.isActive(emoji);
          return html`
            <button
              type="button"
              part="reaction"
              class="article-reaction-button reaction-button inline-flex items-center gap-1 rounded-full border border-koe-border px-2.5 py-1 text-xs text-koe-text-muted transition-colors hover:border-koe-border-strong disabled:opacity-50 ${active
                ? "active"
                : ""}"
              data-emoji=${emoji}
              ?disabled=${this.reacting}
              aria-label=${`React with ${emoji}`}
              aria-pressed=${active}
              @click=${() => this.toggleReaction(emoji)}
            >
              <span>${emoji}</span>
              <span
                part="reaction-count"
                class="reaction-count tabular-nums text-koe-text-subtle"
              >
                ${this.countFor(emoji)}
              </span>
            </button>
          `;
        })}
      </div>
    `;
  }
}
