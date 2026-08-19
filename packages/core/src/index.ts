import { z } from "zod";

// Roles & Statuses
export const UserRoleSchema = z.enum(["guest", "member", "moderator", "admin"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserStatusSchema = z.enum(["active", "suspended", "banned"]);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const IdentityProviderSchema = z.enum(["anonymous", "google", "github", "x"]);
export type IdentityProvider = z.infer<typeof IdentityProviderSchema>;

export const ThreadStatusSchema = z.enum(["open", "closed", "locked"]);
export type ThreadStatus = z.infer<typeof ThreadStatusSchema>;

export const CommentStatusSchema = z.enum(["pending", "published", "spam", "deleted"]);
export type CommentStatus = z.infer<typeof CommentStatusSchema>;

export const ReportStatusSchema = z.enum(["open", "resolved", "dismissed"]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

// User & Identity schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  avatarUrl: z.string().url().nullable(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastActiveAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

export const IdentitySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  provider: IdentityProviderSchema,
  providerUserId: z.string(),
  profileData: z.record(z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Identity = z.infer<typeof IdentitySchema>;

// Thread schemas
export const ThreadSchema = z.object({
  id: z.string().uuid(),
  externalRef: z.string().min(1),
  title: z.string().nullable(),
  url: z.string().nullable(),
  status: ThreadStatusSchema,
  preModeration: z.boolean(),
  commentCount: z.number().int().nonnegative(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Thread = z.infer<typeof ThreadSchema>;

export const GetThreadByRefParamsSchema = z.object({
  ref: z.string().min(1),
});
export type GetThreadByRefParams = z.infer<typeof GetThreadByRefParamsSchema>;

export const GetThreadByRefQuerySchema = z.object({
  title: z.string().optional(),
  url: z.string().optional(),
});
export type GetThreadByRefQuery = z.infer<typeof GetThreadByRefQuerySchema>;

// Comment schemas
export const CommentSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  authorId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  bodyMd: z.string(),
  bodyHtml: z.string(),
  status: CommentStatusSchema,
  depth: z.number().int().min(0).max(4),
  path: z.string(),
  upvotes: z.number().int().default(0),
  downvotes: z.number().int().default(0),
  metadata: z.record(z.unknown()).default({}),
  editedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Comment = z.infer<typeof CommentSchema>;

// Session schemas
export const SessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  refreshTokenHash: z.string().nullable(),
  expiresAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Session = z.infer<typeof SessionSchema>;

// RFC 9457 Problem Details Schema
export const ProblemDetailsSchema = z.object({
  type: z.string().default("about:blank"),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  errors: z.unknown().optional(),
});
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
