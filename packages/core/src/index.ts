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
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  lastActiveAt: z.coerce.date(),
});
export type User = z.infer<typeof UserSchema>;

export const IdentitySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  provider: IdentityProviderSchema,
  providerUserId: z.string(),
  profileData: z.record(z.unknown()).default({}),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
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
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
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

// Vote schemas
export const VoteValueSchema = z.union([z.literal(1), z.literal(-1)]);
export type VoteValue = z.infer<typeof VoteValueSchema>;

export const IdParamSchema = z.object({
  id: z.string().uuid(),
});
export type IdParam = z.infer<typeof IdParamSchema>;

export const VoteSchema = z.object({
  id: z.string().uuid(),
  commentId: z.string().uuid(),
  userId: z.string().uuid(),
  value: VoteValueSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Vote = z.infer<typeof VoteSchema>;

export const VoteParamsSchema = IdParamSchema;
export type VoteParams = IdParam;

export const CreateVoteBodySchema = z.object({
  value: VoteValueSchema,
});
export type CreateVoteBody = z.infer<typeof CreateVoteBodySchema>;

// Comment schemas
export const COMMENT_DEPTH_CAP = 4;

export const CommentSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  authorId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  bodyMd: z.string(),
  bodyHtml: z.string(),
  status: CommentStatusSchema,
  depth: z.number().int().min(0).max(COMMENT_DEPTH_CAP),
  path: z.string(),
  upvotes: z.number().int().default(0),
  downvotes: z.number().int().default(0),
  metadata: z.record(z.unknown()).default({}),
  editedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Comment = z.infer<typeof CommentSchema>;

export type CommentNode = Comment & {
  children: CommentNode[];
  userVote: VoteValue | null;
};
export const CommentNodeSchema: z.ZodType<CommentNode, z.ZodTypeDef, unknown> =
  CommentSchema.extend({
    children: z.lazy(() => z.array(CommentNodeSchema)),
    userVote: VoteValueSchema.nullable().default(null),
  });

export const CreateCommentParamsSchema = IdParamSchema;
export type CreateCommentParams = IdParam;

export const CreateCommentBodySchema = z.object({
  bodyMd: z.string().min(1).max(10000),
  parentId: z.string().uuid().optional(),
});
export type CreateCommentBody = z.infer<typeof CreateCommentBodySchema>;

export const CommentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type CommentListQuery = z.infer<typeof CommentListQuerySchema>;

export const CommentListResponseSchema = z.object({
  comments: z.array(CommentNodeSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type CommentListResponse = z.infer<typeof CommentListResponseSchema>;

// Auth schemas
export const AnonymousAuthResponseSchema = z.object({
  accessToken: z.string(),
  user: UserSchema,
});
export type AnonymousAuthResponse = z.infer<typeof AnonymousAuthResponseSchema>;

export const OAuthStartQuerySchema = z.object({
  guestUserId: z.string().uuid().optional(),
});
export type OAuthStartQuery = z.infer<typeof OAuthStartQuerySchema>;

export const OAuthCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});
export type OAuthCallbackQuery = z.infer<typeof OAuthCallbackQuerySchema>;

export const OAuthCallbackResponseSchema = AnonymousAuthResponseSchema;
export type OAuthCallbackResponse = AnonymousAuthResponse;

// Session schemas
export const SessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  refreshTokenHash: z.string().nullable(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
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
