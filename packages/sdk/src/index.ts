import {
  AnonymousAuthResponse,
  AnonymousAuthResponseSchema,
  Comment,
  CommentListQuery,
  CommentListResponse,
  CommentListResponseSchema,
  CommentModerationActionVerb,
  CommentSchema,
  CreateCommentBody,
  DEFAULT_EMOJI_ALLOWLIST,
  GetThreadByRefQuery,
  ModerationActionListResponse,
  ModerationActionListResponseSchema,
  ModerationActionVerb,
  ModerationQueueItem,
  ModerationQueueResponse,
  ModerationQueueResponseSchema,
  Reaction,
  ReactionSchema,
  Report,
  ReportSchema,
  Thread,
  ThreadResponse,
  ThreadResponseSchema,
  User,
  UserModerationActionVerb,
  UserSchema,
  Vote,
  VoteSchema,
  VoteValue,
} from "@koe/core";
import { ZodTypeAny, z } from "zod";

export type {
  AnonymousAuthResponse,
  Comment,
  CommentListQuery,
  CommentListResponse,
  CommentModerationActionVerb,
  CommentNode,
  CreateCommentBody,
  GetThreadByRefQuery,
  ModerationAction,
  ModerationActionListResponse,
  ModerationActionVerb,
  UserModerationActionVerb,
  ModerationQueueItem,
  ModerationQueueResponse,
  Reaction,
  ReactionTotals,
  Report,
  Thread,
  ThreadResponse,
  User,
  Vote,
  VoteValue,
} from "@koe/core";

export { DEFAULT_EMOJI_ALLOWLIST } from "@koe/core";

export {
  createImgbbMediaProvider,
  MediaUploadError,
} from "./media.js";
export type {
  ImgbbMediaProviderOptions,
  MediaProvider,
  MediaUploadErrorOptions,
  MediaUploadResult,
} from "./media.js";

export interface KoeApiErrorOptions {
  status: number;
  title: string;
  type?: string;
  detail?: string;
  instance?: string;
}

export class KoeApiError extends Error {
  readonly status: number;
  readonly title: string;
  readonly type: string;
  readonly detail?: string;
  readonly instance?: string;

  constructor(options: KoeApiErrorOptions) {
    super(options.detail ?? options.title);
    this.name = "KoeApiError";
    this.status = options.status;
    this.title = options.title;
    this.type = options.type ?? "about:blank";
    this.detail = options.detail;
    this.instance = options.instance;
  }
}

export interface KoeClientOptions {
  baseUrl: string;
  token?: string;
  fetch?: typeof globalThis.fetch;
}

export interface KoeClient {
  auth: {
    anonymous(): Promise<AnonymousAuthResponse>;
    me(token?: string): Promise<User>;
  };
  threads: {
    getByRef(
      ref: string,
      query?: GetThreadByRefQuery,
      token?: string
    ): Promise<ThreadResponse>;
    react(
      threadId: string,
      emoji: string,
      token?: string
    ): Promise<Reaction | null>;
    unreact(threadId: string, emoji: string, token?: string): Promise<void>;
  };
  comments: {
    list(
      threadId: string,
      query?: CommentListQuery,
      token?: string
    ): Promise<CommentListResponse>;
    create(
      threadId: string,
      body: CreateCommentBody,
      token?: string
    ): Promise<Comment>;
    vote(
      commentId: string,
      value: VoteValue,
      token?: string
    ): Promise<Vote | null>;
    unvote(commentId: string, token?: string): Promise<void>;
    react(
      commentId: string,
      emoji: string,
      token?: string
    ): Promise<Reaction | null>;
    unreact(commentId: string, emoji: string, token?: string): Promise<void>;
    report(commentId: string, reason: string, token?: string): Promise<Report>;
  };
  moderation: {
    queue(token?: string): Promise<ModerationQueueResponse>;
    actions(token?: string): Promise<ModerationActionListResponse>;
    act(
      commentId: string,
      action: CommentModerationActionVerb,
      token?: string
    ): Promise<Comment>;
    ban(userId: string, token?: string): Promise<User>;
    suspend(userId: string, token?: string): Promise<User>;
  };
}

interface RequestOptions {
  method: string;
  token?: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | undefined>
): string {
  const normalizedBase = baseUrl
    ? baseUrl.endsWith("/")
      ? baseUrl
      : `${baseUrl}/`
    : typeof window !== "undefined"
      ? `${window.location.origin}/`
      : "http://localhost/";

  const url = new URL(
    path.startsWith("/") ? path.slice(1) : path,
    normalizedBase
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export function createKoeClient(options: KoeClientOptions): KoeClient {
  const fetchFn = options.fetch ?? globalThis.fetch;

  async function request<S extends ZodTypeAny>(
    schema: S,
    path: string,
    requestOptions: RequestOptions
  ): Promise<z.output<S>> {
    const { method, token, query, body } = requestOptions;
    const headers: Record<string, string> = {};
    const effectiveToken = token ?? options.token;
    if (effectiveToken) {
      headers.authorization = `Bearer ${effectiveToken}`;
    }
    if (body !== undefined) {
      headers["content-type"] = "application/json";
    }

    const response = await fetchFn(buildUrl(options.baseUrl, path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let problem: Record<string, unknown> = {};
      try {
        problem = (await response.json()) as Record<string, unknown>;
      } catch {
        // Ignore non-JSON error responses.
      }
      throw new KoeApiError({
        status: response.status,
        title:
          typeof problem.title === "string" ? problem.title : "Request failed",
        type: typeof problem.type === "string" ? problem.type : undefined,
        detail:
          typeof problem.detail === "string" ? problem.detail : undefined,
        instance:
          typeof problem.instance === "string" ? problem.instance : undefined,
      });
    }

    if (response.status === 204) {
      return undefined as unknown as z.output<S>;
    }

    const data: unknown = await response.json();
    return schema.parse(data);
  }

  function moderateUser(
    userId: string,
    action: UserModerationActionVerb,
    token?: string
  ): Promise<User> {
    return request(UserSchema, "/api/v1/moderation/actions", {
      method: "POST",
      body: { userId, action },
      token,
    });
  }

  return {
    auth: {
      anonymous: () =>
        request(AnonymousAuthResponseSchema, "/api/v1/auth/anonymous", {
          method: "POST",
        }),
      me: (token) =>
        request(UserSchema, "/api/v1/auth/me", { method: "GET", token }),
    },
    threads: {
      getByRef: (ref, query, token) =>
        request(
          ThreadResponseSchema,
          `/api/v1/threads/by-ref/${encodeURIComponent(ref)}`,
          { method: "GET", query, token }
        ),
      react: async (threadId, emoji, token) => {
        const result = await request(
          ReactionSchema,
          `/api/v1/threads/${threadId}/reactions`,
          { method: "POST", body: { emoji }, token }
        );
        return result ?? null;
      },
      unreact: async (threadId, emoji, token) => {
        await request(
          ReactionSchema,
          `/api/v1/threads/${threadId}/reactions/${encodeURIComponent(emoji)}`,
          { method: "DELETE", token }
        );
      },
    },
    comments: {
      list: (threadId, query, token) =>
        request(
          CommentListResponseSchema,
          `/api/v1/threads/${threadId}/comments`,
          { method: "GET", query, token }
        ),
      create: (threadId, body, token) =>
        request(CommentSchema, `/api/v1/threads/${threadId}/comments`, {
          method: "POST",
          body,
          token,
        }),
      vote: async (commentId, value, token) => {
        const result = await request(
          VoteSchema,
          `/api/v1/comments/${commentId}/vote`,
          { method: "POST", body: { value }, token }
        );
        return result ?? null;
      },
      unvote: async (commentId, token) => {
        await request(VoteSchema, `/api/v1/comments/${commentId}/vote`, {
          method: "DELETE",
          token,
        });
      },
      react: async (commentId, emoji, token) => {
        const result = await request(
          ReactionSchema,
          `/api/v1/comments/${commentId}/reactions`,
          { method: "POST", body: { emoji }, token }
        );
        return result ?? null;
      },
      unreact: async (commentId, emoji, token) => {
        await request(
          ReactionSchema,
          `/api/v1/comments/${commentId}/reactions/${encodeURIComponent(emoji)}`,
          { method: "DELETE", token }
        );
      },
      report: (commentId, reason, token) =>
        request(ReportSchema, `/api/v1/comments/${commentId}/reports`, {
          method: "POST",
          body: { reason },
          token,
        }),
    },
    moderation: {
      queue: (token) =>
        request(ModerationQueueResponseSchema, "/api/v1/moderation/queue", {
          method: "GET",
          token,
        }),
      actions: (token) =>
        request(
          ModerationActionListResponseSchema,
          "/api/v1/moderation/actions",
          { method: "GET", token }
        ),
      act: (commentId, action, token) =>
        request(CommentSchema, "/api/v1/moderation/actions", {
          method: "POST",
          body: { commentId, action },
          token,
        }),
      ban: (userId, token) => moderateUser(userId, "ban", token),
      suspend: (userId, token) => moderateUser(userId, "suspend", token),
    },
  };
}