import { describe, it, expect } from "vitest";
import { UserSchema, ThreadSchema, CommentSchema } from "./index.js";

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
});
