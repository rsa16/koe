import {
  AdminBulkCommentActionBodySchema,
  AdminBulkCommentActionResponseSchema,
  AdminCommentListResponseSchema,
  AdminCommentThreadListResponseSchema,
  AdminSessionSchema,
  AdminSessionUserSchema,
  AdminSettingsSchema,
  AdminUpdateUserBodySchema,
  AdminUserListResponseSchema,
  CommentModerationActionVerbSchema,
  CommentSchema,
  ModerationQueueResponseSchema,
  UserSchema,
} from "@koe/core";
import type {
  AdminBulkCommentActionBody,
  AdminCommentListQueryInput,
  AdminCommentListResponse,
  AdminCommentThread,
  AdminSession,
  AdminSettings,
  AdminUpdateUserBody,
  AdminUserListQueryInput,
  AdminUserListResponse,
  Comment,
  CommentModerationActionVerb,
  ModerationQueueItem,
  User,
} from "@koe/core";

const CSRF_COOKIE = "koe_csrf";
const CSRF_HEADER = "x-csrf-token";

// The API prefix the admin UI talks to. Defaults to Koe's own /api/v1; hosts
// that namespace the API differently (e.g. otl-site's /api/comments/v1) set
// VITE_ADMIN_API_PREFIX at build time. Mirrors the SDK's `apiPrefix` (ADR 0004).
const API_PREFIX = (import.meta.env.VITE_ADMIN_API_PREFIX ?? "/api/v1").replace(
  /\/$/,
  ""
);

function apiPath(path: string): string {
  return `${API_PREFIX}${path}`;
}

export type OAuthProvider = "google" | "discord";

// URL of the server-side OAuth start endpoint. The server redirects to the
// provider and, on callback, a popup page postMessages the access token back
// to the admin origin (see packages/server/src/oauth-render.ts).
export function oauthStartUrl(provider: OAuthProvider): string {
  return apiPath(`/auth/oauth/${provider}`);
}

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

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof AdminApiError && error.status === 401;
}

export function describeAdminError(error: unknown, fallback: string): string {
  return error instanceof AdminApiError
    ? `${error.type}: ${error.message}`
    : fallback;
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
  const response = await request(apiPath("/admin/session"), {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw await toError(response);
  }
  return AdminSessionSchema.parse(await response.json());
}

export async function getSession(): Promise<User> {
  const response = await request(apiPath("/admin/session"));
  if (!response.ok) {
    throw await toError(response);
  }
  return AdminSessionUserSchema.parse(await response.json()).user;
}

export async function logout(): Promise<void> {
  const csrfToken = readCookie(CSRF_COOKIE);
  const response = await request(apiPath("/admin/session"), {
    method: "DELETE",
    headers: csrfToken ? { [CSRF_HEADER]: csrfToken } : {},
  });
  if (!response.ok && response.status !== 401) {
    throw await toError(response);
  }
}

export async function fetchQueue(): Promise<ModerationQueueItem[]> {
  const response = await request(apiPath("/admin/moderation/queue"));
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
  const response = await request(apiPath("/admin/moderation/actions"), {
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

export type UserListParams = AdminUserListQueryInput;

export async function fetchUsers(
  params: UserListParams = {}
): Promise<AdminUserListResponse> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }
  const suffix = query.toString();
  const response = await request(
    apiPath(`/admin/users${suffix ? `?${suffix}` : ""}`)
  );
  if (!response.ok) {
    throw await toError(response);
  }
  return AdminUserListResponseSchema.parse(await response.json());
}

export async function updateUser(
  userId: string,
  update: AdminUpdateUserBody
): Promise<User> {
  const parsed = AdminUpdateUserBodySchema.parse(update);
  const csrfToken = readCookie(CSRF_COOKIE);
  const response = await request(apiPath(`/admin/users/${userId}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { [CSRF_HEADER]: csrfToken } : {}),
    },
    body: JSON.stringify(parsed),
  });
  if (!response.ok) {
    throw await toError(response);
  }
  return UserSchema.parse(await response.json());
}

export async function fetchSettings(): Promise<AdminSettings> {
  const response = await request(apiPath("/admin/settings"));
  if (!response.ok) {
    throw await toError(response);
  }
  return AdminSettingsSchema.parse(await response.json());
}

export type CommentListParams = AdminCommentListQueryInput;

export async function fetchAdminComments(
  params: CommentListParams = {}
): Promise<AdminCommentListResponse> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }
  const suffix = query.toString();
  const response = await request(
    apiPath(`/admin/comments${suffix ? `?${suffix}` : ""}`)
  );
  if (!response.ok) {
    throw await toError(response);
  }
  return AdminCommentListResponseSchema.parse(await response.json());
}

export async function fetchAdminCommentThreads(): Promise<AdminCommentThread[]> {
  const response = await request(apiPath("/admin/comments/threads"));
  if (!response.ok) {
    throw await toError(response);
  }
  return AdminCommentThreadListResponseSchema.parse(
    await response.json()
  ).threads;
}

export async function bulkModerateComments(
  body: AdminBulkCommentActionBody
): Promise<number> {
  const parsed = AdminBulkCommentActionBodySchema.parse(body);
  const csrfToken = readCookie(CSRF_COOKIE);
  const response = await request(apiPath("/admin/comments/actions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { [CSRF_HEADER]: csrfToken } : {}),
    },
    body: JSON.stringify(parsed),
  });
  if (!response.ok) {
    throw await toError(response);
  }
  return AdminBulkCommentActionResponseSchema.parse(await response.json())
    .updated;
}
