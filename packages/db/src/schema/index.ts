import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, pgEnum, index, uniqueIndex, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["guest", "member", "moderator", "admin"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended", "banned"]);
export const identityProviderEnum = pgEnum("identity_provider", ["anonymous", "google", "github", "x"]);
export const threadStatusEnum = pgEnum("thread_status", ["open", "closed", "locked"]);
export const commentStatusEnum = pgEnum("comment_status", ["pending", "published", "spam", "deleted"]);
export const reactionTargetTypeEnum = pgEnum("reaction_target_type", ["comment", "thread"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: userRoleEnum("role").notNull().default("guest"),
  status: userStatusEnum("status").notNull().default("active"),
  name: text("name"),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
});

export const identities = pgTable("identities", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: identityProviderEnum("provider").notNull(),
  providerUserId: text("provider_user_id").notNull(),
  profileData: jsonb("profile_data").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_identities_provider_user").on(table.provider, table.providerUserId),
  index("idx_identities_user_id").on(table.userId),
]);

export const threads = pgTable("threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalRef: text("external_ref").notNull().unique(),
  title: text("title"),
  url: text("url"),
  status: threadStatusEnum("status").notNull().default("open"),
  preModeration: boolean("pre_moderation").notNull().default(true),
  commentCount: integer("comment_count").notNull().default(0),
  reactionTotals: jsonb("reaction_totals").notNull().default({}),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_threads_external_ref").on(table.externalRef),
]);

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  bodyMd: text("body_md").notNull(),
  bodyHtml: text("body_html").notNull(),
  status: commentStatusEnum("status").notNull().default("pending"),
  depth: integer("depth").notNull().default(0),
  path: text("path").notNull().default(""),
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  reactionTotals: jsonb("reaction_totals").notNull().default({}),
  metadata: jsonb("metadata").notNull().default({}),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_comments_thread_id").on(table.threadId),
  index("idx_comments_parent_id").on(table.parentId),
  index("idx_comments_author_id").on(table.authorId),
]);

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commentId: uuid("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    value: integer("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_votes_comment_user").on(table.commentId, table.userId),
    check("votes_value_check", sql`${table.value} IN (1, -1)`),
  ]
);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  refreshTokenHash: text("refresh_token_hash"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_sessions_user_id").on(table.userId),
]);

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: reactionTargetTypeEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_reactions_target_user_emoji").on(
      table.targetType,
      table.targetId,
      table.userId,
      table.emoji
    ),
    index("idx_reactions_target_id").on(table.targetType, table.targetId),
    index("idx_reactions_user_id").on(table.userId),
  ]
);
