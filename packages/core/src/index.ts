import { z } from "zod";

export * from "./events.js";

// Roles & Statuses
export const UserRoleSchema = z.enum(["guest", "member", "moderator", "admin"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserStatusSchema = z.enum(["active", "suspended", "banned"]);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const IdentityProviderSchema = z.enum(["anonymous", "google", "discord", "github", "x"]);
export type IdentityProvider = z.infer<typeof IdentityProviderSchema>;

export const ThreadStatusSchema = z.enum(["open", "closed", "locked"]);
export type ThreadStatus = z.infer<typeof ThreadStatusSchema>;

export const CommentStatusSchema = z.enum(["pending", "published", "spam", "deleted"]);
export type CommentStatus = z.infer<typeof CommentStatusSchema>;

export const ReportStatusSchema = z.enum(["open", "resolved", "dismissed"]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const ReactionTotalsSchema = z.record(
  z.string(),
  z.number().int().nonnegative()
);
export type ReactionTotals = z.infer<typeof ReactionTotalsSchema>;

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

export const UpdateUserBodySchema = z
  .object({
    role: UserRoleSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update",
  });
export type UpdateUserBody = z.infer<typeof UpdateUserBodySchema>;

export const UpdateProfileBodySchema = z
  .object({
    name: z.string().trim().min(1).max(80).nullable().optional(),
    avatarUrl: z.string().url().max(2048).nullable().optional(),
  })
  .refine((data) => data.name !== undefined || data.avatarUrl !== undefined, {
    message: "At least one field must be provided to update",
  });
export type UpdateProfileBody = z.infer<typeof UpdateProfileBodySchema>;

export const AdminUpdateUserBodySchema = z
  .object({
    role: UserRoleSchema.optional(),
    status: UserStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update",
  });
export type AdminUpdateUserBody = z.infer<typeof AdminUpdateUserBodySchema>;

export const AdminUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: UserRoleSchema.optional(),
  status: UserStatusSchema.optional(),
  search: z.string().trim().min(1).optional(),
});
export type AdminUserListQuery = z.infer<typeof AdminUserListQuerySchema>;
export type AdminUserListQueryInput = z.input<typeof AdminUserListQuerySchema>;

export const AdminUserListResponseSchema = z.object({
  users: z.array(UserSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type AdminUserListResponse = z.infer<typeof AdminUserListResponseSchema>;

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

// Flair schemas
// A Flair is a hand-editable definition (slug, label, colour, rank). Staff Flairs
// are derived from a User's role and are not stored here (see CONTEXT.md).
export const FlairSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Must be a lowercase slug of letters, digits and single hyphens"
  );
export type FlairSlug = z.infer<typeof FlairSlugSchema>;

export const FlairLabelSchema = z.string().trim().min(1).max(80);
export type FlairLabel = z.infer<typeof FlairLabelSchema>;

export const FlairColourSchema = z
  .string()
  .regex(
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
    "Must be a hex colour such as #a1b2c3"
  );
export type FlairColour = z.infer<typeof FlairColourSchema>;

export const FlairRankSchema = z.number().int();
export type FlairRank = z.infer<typeof FlairRankSchema>;

export const FlairSchema = z.object({
  id: z.string().uuid(),
  slug: FlairSlugSchema,
  label: FlairLabelSchema,
  colour: FlairColourSchema,
  rank: FlairRankSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Flair = z.infer<typeof FlairSchema>;

export const CreateFlairBodySchema = z.object({
  slug: FlairSlugSchema,
  label: FlairLabelSchema,
  colour: FlairColourSchema,
  rank: FlairRankSchema,
});
export type CreateFlairBody = z.infer<typeof CreateFlairBodySchema>;

// The slug is deliberately immutable: external systems hold on to it, so a
// rename is a label change, not a slug change.
export const UpdateFlairBodySchema = z
  .object({
    label: FlairLabelSchema.optional(),
    colour: FlairColourSchema.optional(),
    rank: FlairRankSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update",
  });
export type UpdateFlairBody = z.infer<typeof UpdateFlairBodySchema>;

export const FlairListResponseSchema = z.object({
  flairs: z.array(FlairSchema),
});
export type FlairListResponse = z.infer<typeof FlairListResponseSchema>;

// A Flair as rendered beside an author's name on a Comment. Supporter Flairs are
// projected from the definition rows the author holds; Staff Flairs are derived
// from the author's role and are never stored, so they carry no definition
// colour (`colour: null`) and the widget falls back to the host accent token.
export const CommentAuthorFlairSchema = z.object({
  slug: FlairSlugSchema,
  label: FlairLabelSchema,
  colour: FlairColourSchema.nullable(),
  rank: FlairRankSchema,
  staff: z.boolean().default(false),
});
export type CommentAuthorFlair = z.infer<typeof CommentAuthorFlairSchema>;

// Staff Flairs are derived from a User's role, never held or chosen. A negative
// rank keeps them ahead of every Supporter Flair, and each role maps to exactly
// one. `admin` outranks `moderator`.
export const ADMIN_STAFF_FLAIR: CommentAuthorFlair = {
  slug: "admin",
  label: "Admin",
  colour: null,
  rank: -200,
  staff: true,
};

export const MODERATOR_STAFF_FLAIR: CommentAuthorFlair = {
  slug: "moderator",
  label: "Moderator",
  colour: null,
  rank: -100,
  staff: true,
};

/** The Staff Flairs an author with this role displays; empty for everyone else. */
export function staffFlairsForRole(role: UserRole | null): CommentAuthorFlair[] {
  if (role === "admin") {
    return [ADMIN_STAFF_FLAIR];
  }
  if (role === "moderator") {
    return [MODERATOR_STAFF_FLAIR];
  }
  return [];
}

// Service API schemas
// A scoped service credential (a single configured secret) may do exactly two
// things: replace a User's held Flairs wholesale, and resolve a provider
// Identity to its owning User. Setting is whole-set and idempotent, so absence
// means release.
export const ServiceFlairAssignmentBodySchema = z.object({
  slugs: z.array(FlairSlugSchema),
});
export type ServiceFlairAssignmentBody = z.infer<
  typeof ServiceFlairAssignmentBodySchema
>;

export const ServiceFlairAssignmentResponseSchema = z.object({
  applied: z.array(FlairSlugSchema),
  unknownSlugs: z.array(FlairSlugSchema),
});
export type ServiceFlairAssignmentResponse = z.infer<
  typeof ServiceFlairAssignmentResponseSchema
>;

export const ServiceIdentityQuerySchema = z.object({
  provider: IdentityProviderSchema,
  providerUserId: z.string().trim().min(1),
});
export type ServiceIdentityQuery = z.infer<typeof ServiceIdentityQuerySchema>;

export const ServiceIdentityResponseSchema = z.object({
  userId: z.string().uuid(),
});
export type ServiceIdentityResponse = z.infer<
  typeof ServiceIdentityResponseSchema
>;

// Thread schemas
export const ThreadSchema = z.object({
  id: z.string().uuid(),
  externalRef: z.string().min(1),
  title: z.string().nullable(),
  url: z.string().nullable(),
  status: ThreadStatusSchema,
  preModeration: z.boolean(),
  commentCount: z.number().int().nonnegative(),
  reactionTotals: ReactionTotalsSchema.default({}),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Thread = z.infer<typeof ThreadSchema>;

export const ThreadResponseSchema = ThreadSchema.extend({
  userReactions: z.array(z.string()).default([]),
});
export type ThreadResponse = z.infer<typeof ThreadResponseSchema>;

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

// Reaction schemas
export const ReactionTargetTypeSchema = z.enum(["comment", "thread"]);
export type ReactionTargetType = z.infer<typeof ReactionTargetTypeSchema>;

export const EmojiSchema = z
  .string()
  .min(1)
  .max(16)
  .regex(
    /^\p{Extended_Pictographic}(?:\uFE0F)?(?:[\u{1F3FB}-\u{1F3FF}])?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?(?:[\u{1F3FB}-\u{1F3FF}])?)*$/u,
    "Must be an emoji"
  );
export type Emoji = z.infer<typeof EmojiSchema>;

export const DEFAULT_EMOJI_ALLOWLIST = ["👍", "❤️", "😂", "🎉", "😮", "🙏"];

export const EmojiAllowlistSchema = z.array(EmojiSchema).min(1);
export type EmojiAllowlist = z.infer<typeof EmojiAllowlistSchema>;

export const ReactionSchema = z.object({
  id: z.string().uuid(),
  targetType: ReactionTargetTypeSchema,
  targetId: z.string().uuid(),
  userId: z.string().uuid(),
  emoji: EmojiSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Reaction = z.infer<typeof ReactionSchema>;

export const CreateReactionParamsSchema = IdParamSchema;
export type CreateReactionParams = IdParam;

export const CreateReactionBodySchema = z.object({
  emoji: EmojiSchema,
});
export type CreateReactionBody = z.infer<typeof CreateReactionBodySchema>;

export const DeleteReactionParamsSchema = z.object({
  id: z.string().uuid(),
  emoji: EmojiSchema,
});
export type DeleteReactionParams = z.infer<typeof DeleteReactionParamsSchema>;

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
  reactionTotals: ReactionTotalsSchema.default({}),
  metadata: z.record(z.unknown()).default({}),
  pinnedAt: z.coerce.date().nullable().default(null),
  editedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Comment = z.infer<typeof CommentSchema>;

export type CommentNode = Comment & {
  authorName: string | null;
  authorAvatarUrl: string | null;
  authorRole: UserRole | null;
  authorFlairs: CommentAuthorFlair[];
  children: CommentNode[];
  userVote: VoteValue | null;
  userReactions: string[];
};
export const CommentNodeSchema: z.ZodType<CommentNode, z.ZodTypeDef, unknown> =
  CommentSchema.extend({
    authorName: z.string().nullable().default(null),
    authorAvatarUrl: z.string().url().nullable().default(null),
    authorRole: UserRoleSchema.nullable().default(null),
    // Already ordered server-side, Staff Flairs first; the widget renders the
    // list as given and never infers or sorts it.
    authorFlairs: z.array(CommentAuthorFlairSchema).default([]),
    children: z.lazy(() => z.array(CommentNodeSchema)),
    userVote: VoteValueSchema.nullable().default(null),
    userReactions: z.array(z.string()).default([]),
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

// Report schemas
export const ReportSchema = z.object({
  id: z.string().uuid(),
  commentId: z.string().uuid(),
  reporterId: z.string().uuid(),
  reason: z.string(),
  status: ReportStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Report = z.infer<typeof ReportSchema>;

export const CreateReportParamsSchema = IdParamSchema;
export type CreateReportParams = IdParam;

export const CreateReportBodySchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});
export type CreateReportBody = z.infer<typeof CreateReportBodySchema>;

// Moderation schemas
export const ModerationTargetTypeSchema = z.enum(["comment", "user", "thread"]);
export type ModerationTargetType = z.infer<typeof ModerationTargetTypeSchema>;

const COMMENT_MODERATION_ACTIONS = ["approve", "reject", "delete", "spam"] as const;
const USER_MODERATION_ACTIONS = ["ban", "suspend"] as const;
const NETWORK_MODERATION_ACTIONS = ["block"] as const;

export const CommentModerationActionVerbSchema = z.enum(
  COMMENT_MODERATION_ACTIONS
);
export type CommentModerationActionVerb = z.infer<
  typeof CommentModerationActionVerbSchema
>;

export const UserModerationActionVerbSchema = z.enum(USER_MODERATION_ACTIONS);
export type UserModerationActionVerb = z.infer<
  typeof UserModerationActionVerbSchema
>;

export const ModerationActionVerbSchema = z.enum([
  ...COMMENT_MODERATION_ACTIONS,
  ...USER_MODERATION_ACTIONS,
  ...NETWORK_MODERATION_ACTIONS,
]);
export type ModerationActionVerb = z.infer<typeof ModerationActionVerbSchema>;

export const CommentModerationActionSchema = z.object({
  commentId: z.string().uuid(),
  action: CommentModerationActionVerbSchema,
});
export type CommentModerationAction = z.infer<
  typeof CommentModerationActionSchema
>;

export const UserModerationActionSchema = z.object({
  userId: z.string().uuid(),
  action: UserModerationActionVerbSchema,
});
export type UserModerationAction = z.infer<typeof UserModerationActionSchema>;

export const CreateModerationActionBodySchema = z.union([
  CommentModerationActionSchema,
  UserModerationActionSchema,
]);
export type CreateModerationActionBody = z.infer<
  typeof CreateModerationActionBodySchema
>;

export const ThreadContextSchema = ThreadSchema.pick({
  id: true,
  externalRef: true,
  title: true,
  url: true,
});
export type ThreadContext = z.infer<typeof ThreadContextSchema>;

export const ModerationQueueItemSchema = CommentSchema.extend({
  thread: ThreadContextSchema,
  authorName: z.string().nullable(),
});
export type ModerationQueueItem = z.infer<typeof ModerationQueueItemSchema>;

export const ModerationQueueResponseSchema = z.object({
  comments: z.array(ModerationQueueItemSchema),
});
export type ModerationQueueResponse = z.infer<
  typeof ModerationQueueResponseSchema
>;

export const ModerationActionSchema = z.object({
  id: z.string().uuid(),
  actorId: z.string().uuid(),
  action: ModerationActionVerbSchema,
  targetType: ModerationTargetTypeSchema,
  targetId: z.string().uuid(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.coerce.date(),
});
export type ModerationAction = z.infer<typeof ModerationActionSchema>;

export const ModerationActionItemSchema = ModerationActionSchema.extend({
  actorName: z.string().nullable(),
});
export type ModerationActionItem = z.infer<typeof ModerationActionItemSchema>;

export const ModerationActionListResponseSchema = z.object({
  actions: z.array(ModerationActionItemSchema),
});
export type ModerationActionListResponse = z.infer<
  typeof ModerationActionListResponseSchema
>;

// Network Block schemas
export const NetworkBlockSourceSchema = z.enum(["auto"]);
export type NetworkBlockSource = z.infer<typeof NetworkBlockSourceSchema>;

export const NetworkBlockSchema = z.object({
  id: z.string().uuid(),
  ip: z.string().min(1),
  reason: z.string(),
  source: NetworkBlockSourceSchema,
  createdBy: z.string().uuid(),
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
});
export type NetworkBlock = z.infer<typeof NetworkBlockSchema>;

// Admin console view over active Network Blocks. `createdByName` is the admin
// whose ban derived the block; `bannedUserId`/`bannedUserName` are the most
// recently banned User it was derived from (null when no ban is on record).
export const AdminNetworkBlockItemSchema = NetworkBlockSchema.extend({
  createdByName: z.string().nullable(),
  bannedUserId: z.string().uuid().nullable(),
  bannedUserName: z.string().nullable(),
});
export type AdminNetworkBlockItem = z.infer<typeof AdminNetworkBlockItemSchema>;

export const AdminNetworkBlockListResponseSchema = z.object({
  blocks: z.array(AdminNetworkBlockItemSchema),
});
export type AdminNetworkBlockListResponse = z.infer<
  typeof AdminNetworkBlockListResponseSchema
>;

// Admin comments console: a filterable, paginated view over every comment,
// not just the pending/reported queue.
export const AdminCommentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: CommentStatusSchema.optional(),
  threadId: z.string().uuid().optional(),
  authorId: z.string().uuid().optional(),
  search: z.string().trim().min(1).optional(),
});
export type AdminCommentListQuery = z.infer<typeof AdminCommentListQuerySchema>;
export type AdminCommentListQueryInput = z.input<
  typeof AdminCommentListQuerySchema
>;

export const AdminCommentItemSchema = CommentSchema.extend({
  thread: ThreadContextSchema,
  authorName: z.string().nullable(),
  authorEmail: z.string().email().nullable(),
});
export type AdminCommentItem = z.infer<typeof AdminCommentItemSchema>;

export const AdminCommentListResponseSchema = z.object({
  comments: z.array(AdminCommentItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type AdminCommentListResponse = z.infer<
  typeof AdminCommentListResponseSchema
>;

// Threads that currently hold comments, with a comment count. Powers the
// console's "filter comments by page" selector.
export const AdminCommentThreadSchema = ThreadContextSchema.extend({
  commentCount: z.number().int().nonnegative(),
});
export type AdminCommentThread = z.infer<typeof AdminCommentThreadSchema>;

export const AdminCommentThreadListResponseSchema = z.object({
  threads: z.array(AdminCommentThreadSchema),
});
export type AdminCommentThreadListResponse = z.infer<
  typeof AdminCommentThreadListResponseSchema
>;

// Bulk comment actions available from the admin console. `pin`/`unpin` adjust
// curation; the rest map onto the existing moderation action verbs.
export const AdminCommentBulkActionVerbSchema = z.enum([
  "approve",
  "reject",
  "delete",
  "spam",
  "pin",
  "unpin",
]);
export type AdminCommentBulkActionVerb = z.infer<
  typeof AdminCommentBulkActionVerbSchema
>;

export const AdminBulkCommentActionBodySchema = z.object({
  commentIds: z.array(z.string().uuid()).min(1).max(100),
  action: AdminCommentBulkActionVerbSchema,
});
export type AdminBulkCommentActionBody = z.infer<
  typeof AdminBulkCommentActionBodySchema
>;

export const AdminBulkCommentActionResponseSchema = z.object({
  updated: z.number().int().nonnegative(),
});
export type AdminBulkCommentActionResponse = z.infer<
  typeof AdminBulkCommentActionResponseSchema
>;

// Auth schemas
// An access/refresh token pair plus the identity it belongs to. Returned by
// guest login, OAuth login, and refresh — hence the neutral name.
export const AuthTokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().min(1),
  user: UserSchema,
});
export type AuthTokenResponse = z.infer<typeof AuthTokenResponseSchema>;

export const AnonymousAuthResponseSchema = AuthTokenResponseSchema;
export type AnonymousAuthResponse = AuthTokenResponse;

// Rotates an (opaque) refresh token for a fresh access/refresh pair.
export const RefreshTokenBodySchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenBody = z.infer<typeof RefreshTokenBodySchema>;

export const OAuthStartQuerySchema = z.object({
  guestUserId: z.string().uuid().optional(),
});
export type OAuthStartQuery = z.infer<typeof OAuthStartQuerySchema>;

export const OAuthCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});
export type OAuthCallbackQuery = z.infer<typeof OAuthCallbackQuerySchema>;

export const OAuthCallbackResponseSchema = AuthTokenResponseSchema;
export type OAuthCallbackResponse = AuthTokenResponse;

// Admin UI session schemas
export const AdminSessionSchema = z.object({
  user: UserSchema,
  csrfToken: z.string().min(1),
});
export type AdminSession = z.infer<typeof AdminSessionSchema>;

export const AdminSessionUserSchema = z.object({
  user: UserSchema,
});
export type AdminSessionUser = z.infer<typeof AdminSessionUserSchema>;

// Admin settings: read-only view of effective server configuration
export const AdminSettingsSchema = z.object({
  commentDepthCap: z.number().int().positive(),
  reactionAllowlist: z.array(z.string()),
  preModerationDefault: z.boolean(),
  googleOAuthEnabled: z.boolean(),
  discordOAuthEnabled: z.boolean(),
});
export type AdminSettings = z.infer<typeof AdminSettingsSchema>;

// Session schemas
export const SessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  refreshTokenHash: z.string().nullable(),
  previousRefreshTokenHash: z.string().nullable(),
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
