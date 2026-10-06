import {
  AdminSessionSchema,
  AdminSessionUserSchema,
  CommentModerationActionVerbSchema,
  CommentSchema,
  ModerationQueueResponseSchema,
} from "@koe/core";
import type {
  AdminSession,
  Comment,
  CommentModerationActionVerb,
  ModerationQueueItem,
  User,
} from "@koe/core";

const CSRF_COOKIE = "koe_csrf";
const CSRF_HEADER = "x-csrf-token";

export class AdminApiError extends Error {
  readonly status: number;
  readonly type: string;

  constructor(status: number, title: string, detail?: string) {
    super(detail ?? title);
    this.name = "AdminApiError";
    this.status = status;
    this.type = title;
  }
}

function readCookie(name: string): string | undefined {
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

async function toError(response: Response): Promise<AdminApiError> {
  try {
    const problem = await response.json();
    return new AdminApiError(
      response.status,
      problem.title ?? "Request failed",
      problem.detail
    );
  } catch {
    return new AdminApiError(response.status, "Request failed");
  }
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(path, {
    credentials: "same-origin",
    ...init,
  });
}

export async function login(accessToken: string): Promise<AdminSession> {
  const response = await request("/api/v1/admin/session", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw await toError(response);
  }
  return AdminSessionSchema.parse(await response.json());
}

export async function getSession(): Promise<User> {
  const response = await request("/api/v1/admin/session");
  if (!response.ok) {
    throw await toError(response);
  }
  return AdminSessionUserSchema.parse(await response.json()).user;
}

export async function logout(): Promise<void> {
  const csrfToken = readCookie(CSRF_COOKIE);
  const response = await request("/api/v1/admin/session", {
    method: "DELETE",
    headers: csrfToken ? { [CSRF_HEADER]: csrfToken } : {},
  });
  if (!response.ok && response.status !== 401) {
    throw await toError(response);
  }
}

export async function fetchQueue(): Promise<ModerationQueueItem[]> {
  const response = await request("/api/v1/admin/moderation/queue");
  if (!response.ok) {
    throw await toError(response);
  }
  return ModerationQueueResponseSchema.parse(await response.json()).comments;
}

export async function moderate(
  commentId: string,
  action: CommentModerationActionVerb
): Promise<Comment> {
  const parsedAction = CommentModerationActionVerbSchema.parse(action);
  const csrfToken = readCookie(CSRF_COOKIE);
  const response = await request("/api/v1/admin/moderation/actions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { [CSRF_HEADER]: csrfToken } : {}),
    },
    body: JSON.stringify({ commentId, action: parsedAction }),
  });
  if (!response.ok) {
    throw await toError(response);
  }
  return CommentSchema.parse(await response.json());
}
