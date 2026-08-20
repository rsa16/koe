import {
  AnonymousAuthResponse,
  AnonymousAuthResponseSchema,
  Comment,
  CommentListQuery,
  CommentListResponse,
  CommentListResponseSchema,
  CommentSchema,
  CreateCommentBody,
  GetThreadByRefQuery,
  Thread,
  ThreadSchema,
  User,
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
  CommentNode,
  CreateCommentBody,
  GetThreadByRefQuery,
  Thread,
  User,
  Vote,
  VoteValue,
} from "@koe/core";

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
    getByRef(ref: string, query?: GetThreadByRefQuery): Promise<Thread>;
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
  const url = new URL(
    path,
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
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
      getByRef: (ref, query) =>
        request(
          ThreadSchema,
          `/api/v1/threads/by-ref/${encodeURIComponent(ref)}`,
          { method: "GET", query }
        ),
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
    },
  };
}