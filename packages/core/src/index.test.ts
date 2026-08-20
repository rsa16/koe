import { describe, it, expect } from "vitest";
import {
  CommentListQuerySchema,
  CommentListResponseSchema,
  CreateCommentBodySchema,
  UserSchema,
  ThreadSchema,
  CommentSchema,
} from "./index.js";

describe("Core Zod Schemas", () => {
  it("validates a valid thread object", () => {
    const validThread = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      externalRef: "blog-post-1",
      title: "Hello World",
      url: "https://example.com/hello-world",
      status: "open",
      preModeration: true,
      commentCount: 0,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const parsed = ThreadSchema.safeParse(validThread);
    expect(parsed.success).toBe(true);
  });

  it("validates user roles and statuses", () => {
    const validUser = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      role: "guest",
      status: "active",
      name: "Anonymous",
      email: null,
      avatarUrl: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActiveAt: new Date(),
    };

    const parsed = UserSchema.safeParse(validUser);
    expect(parsed.success).toBe(true);
  });

  it("validates UpdateUserBodySchema", async () => {
    const { UpdateUserBodySchema } = await import("./index.js");
    expect(UpdateUserBodySchema.safeParse({ role: "admin" }).success).toBe(true);
    expect(UpdateUserBodySchema.safeParse({ role: "moderator" }).success).toBe(true);
    expect(UpdateUserBodySchema.safeParse({ role: "invalid_role" }).success).toBe(false);
    expect(UpdateUserBodySchema.safeParse({}).success).toBe(false);
  });

  it("coerces ISO date strings into Date instances", () => {
    const parsed = UserSchema.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      role: "guest",
      status: "active",
      name: null,
      email: null,
      avatarUrl: null,
      metadata: {},
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
      lastActiveAt: "2026-08-19T00:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.createdAt).toBeInstanceOf(Date);
    }
  });

  it("validates a valid comment object", () => {
    const validComment = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      threadId: "223e4567-e89b-12d3-a456-426614174000",
      authorId: "323e4567-e89b-12d3-a456-426614174000",
      parentId: null,
      bodyMd: "Hello **world**",
      bodyHtml: "Hello **world**",
      status: "published",
      depth: 0,
      path: "",
      upvotes: 0,
      downvotes: 0,
      metadata: {},
      editedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    };

    const parsed = CommentSchema.safeParse(validComment);
    expect(parsed.success).toBe(true);
  });

  it("accepts a valid comment creation body", () => {
    const parsed = CreateCommentBodySchema.safeParse({ bodyMd: "A comment" });
    expect(parsed.success).toBe(true);
  });

  it("rejects an empty comment creation body", () => {
    const parsed = CreateCommentBodySchema.safeParse({ bodyMd: "" });
    expect(parsed.success).toBe(false);
  });

  it("parses paginated comment list queries with defaults", () => {
    const parsed = CommentListQuerySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(1);
      expect(parsed.data.pageSize).toBe(20);
    }

    const parsedExplicit = CommentListQuerySchema.safeParse({ page: "3", pageSize: "50" });
    expect(parsedExplicit.success).toBe(true);
    if (parsedExplicit.success) {
      expect(parsedExplicit.data.page).toBe(3);
      expect(parsedExplicit.data.pageSize).toBe(50);
    }
  });

  it("validates a comment list response", () => {
    const parsed = CommentListResponseSchema.safeParse({
      comments: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    expect(parsed.success).toBe(true);
  });
});
