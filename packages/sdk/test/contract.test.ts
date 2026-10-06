import { describe, it, expect } from "vitest";
import { createKoeClient, KoeApiError } from "../src/index.js";
import { mockFetch } from "./helpers.js";

const ISO_DATE = "2026-08-19T12:00:00.000Z";

const guestUser = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  role: "guest",
  status: "active",
  name: null,
  email: null,
  avatarUrl: null,
  metadata: {},
  createdAt: ISO_DATE,
  updatedAt: ISO_DATE,
  lastActiveAt: ISO_DATE,
};

const thread = {
  id: "223e4567-e89b-12d3-a456-426614174000",
  externalRef: "my-post",
  title: "My Post",
  url: null,
  status: "open",
  preModeration: true,
  commentCount: 1,
  metadata: {},
  createdAt: ISO_DATE,
  updatedAt: ISO_DATE,
};

const comment = {
  id: "323e4567-e89b-12d3-a456-426614174000",
  threadId: thread.id,
  authorId: guestUser.id,
  parentId: null,
  bodyMd: "Hello **world**",
  bodyHtml: "",
  status: "pending",
  depth: 0,
  path: "",
  upvotes: 0,
  downvotes: 0,
  metadata: {},
  editedAt: null,
  createdAt: ISO_DATE,
  updatedAt: ISO_DATE,
  children: [],
};

const createdReply = {
  id: "423e4567-e89b-12d3-a456-426614174000",
  threadId: thread.id,
  authorId: guestUser.id,
  parentId: comment.id,
  bodyMd: "A **reply**",
  bodyHtml: "",
  status: "pending",
  depth: 1,
  path: `/${comment.id}`,
  upvotes: 0,
  downvotes: 0,
  metadata: {},
  editedAt: null,
  createdAt: ISO_DATE,
  updatedAt: ISO_DATE,
};

const vote = {
  id: "523e4567-e89b-12d3-a456-426614174000",
  commentId: comment.id,
  userId: guestUser.id,
  value: 1,
  createdAt: ISO_DATE,
  updatedAt: ISO_DATE,
};

const reaction = {
  id: "623e4567-e89b-12d3-a456-426614174000",
  targetType: "comment",
  targetId: comment.id,
  userId: guestUser.id,
  emoji: "👍",
  createdAt: ISO_DATE,
  updatedAt: ISO_DATE,
};

const report = {
  id: "723e4567-e89b-12d3-a456-426614174000",
  commentId: comment.id,
  reporterId: guestUser.id,
  reason: "abusive language",
  status: "open",
  createdAt: ISO_DATE,
  updatedAt: ISO_DATE,
};

const moderationAction = {
  id: "823e4567-e89b-12d3-a456-426614174000",
  actorId: guestUser.id,
  action: "approve",
  targetType: "comment",
  targetId: comment.id,
  metadata: {},
  createdAt: ISO_DATE,
  actorName: "Alice",
};

const moderationQueueItem = {
  id: comment.id,
  threadId: comment.threadId,
  authorId: comment.authorId,
  parentId: comment.parentId,
  bodyMd: comment.bodyMd,
  bodyHtml: comment.bodyHtml,
  status: "pending",
  depth: 0,
  path: "",
  upvotes: 0,
  downvotes: 0,
  reactionTotals: {},
  metadata: {},
  editedAt: null,
  createdAt: ISO_DATE,
  updatedAt: ISO_DATE,
  thread: {
    id: thread.id,
    externalRef: thread.externalRef,
    title: thread.title,
    url: thread.url,
  },
  authorName: "Alice",
};

describe("Koe SDK Contract Tests", () => {
  it("auth.anonymous posts to the anonymous endpoint and parses the response", async () => {
    const { fetchFn, calls } = mockFetch(() => ({
      status: 200,
      body: { accessToken: "access-token", user: guestUser },
    }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const result = await client.auth.anonymous();

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("http://localhost:3000/api/v1/auth/anonymous");
    expect(calls[0].init.method).toBe("POST");
    expect(result.accessToken).toBe("access-token");
    expect(result.user.role).toBe("guest");
    expect(result.user.createdAt).toBeInstanceOf(Date);
  });

  it("auth.me sends the bearer token and parses the user", async () => {
    const { fetchFn, calls } = mockFetch(() => ({ status: 200, body: guestUser }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000/", fetch: fetchFn });

    const result = await client.auth.me("some-token");

    expect(calls[0].url).toBe("http://localhost:3000/api/v1/auth/me");
    expect(calls[0].init.headers).toMatchObject({
      authorization: "Bearer some-token",
    });
    expect(result.id).toBe(guestUser.id);
  });

  it("threads.getByRef encodes the ref and query parameters", async () => {
    const { fetchFn, calls } = mockFetch(() => ({ status: 200, body: thread }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const result = await client.threads.getByRef("post/one", {
      title: "My Post",
      url: "https://example.com/post/one",
    });

    expect(calls[0].url).toBe(
      "http://localhost:3000/api/v1/threads/by-ref/post%2Fone?title=My+Post&url=https%3A%2F%2Fexample.com%2Fpost%2Fone"
    );
    expect(result.externalRef).toBe("my-post");
    expect(result.commentCount).toBe(1);
  });

  it("threads.getByRef parses reaction totals and the current user's reactions", async () => {
    const { fetchFn } = mockFetch(() => ({
      status: 200,
      body: {
        ...thread,
        reactionTotals: { "🎉": 2 },
        userReactions: ["🎉"],
      },
    }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const result = await client.threads.getByRef("my-post", undefined, "some-token");

    expect(result.reactionTotals).toEqual({ "🎉": 2 });
    expect(result.userReactions).toEqual(["🎉"]);
  });

  it("threads.react posts the emoji to the thread reactions endpoint", async () => {
    const { fetchFn, calls } = mockFetch(() => ({
      status: 201,
      body: { ...reaction, targetType: "thread", targetId: thread.id },
    }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const result = await client.threads.react(thread.id, "👍", "some-token");

    expect(calls[0].url).toBe(
      `http://localhost:3000/api/v1/threads/${thread.id}/reactions`
    );
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.headers).toMatchObject({
      authorization: "Bearer some-token",
      "content-type": "application/json",
    });
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ emoji: "👍" });
    expect(result?.targetType).toBe("thread");
    expect(result?.targetId).toBe(thread.id);
  });

  it("threads.react returns null when the reaction is toggled off (204)", async () => {
    const { fetchFn } = mockFetch(() => ({ status: 204, body: null }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const result = await client.threads.react(thread.id, "👍", "some-token");

    expect(result).toBeNull();
  });

  it("threads.unreact deletes the reaction with an encoded emoji", async () => {
    const { fetchFn, calls } = mockFetch(() => ({ status: 204, body: null }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    await client.threads.unreact(thread.id, "👍", "some-token");

    expect(calls[0].url).toBe(
      `http://localhost:3000/api/v1/threads/${thread.id}/reactions/%F0%9F%91%8D`
    );
    expect(calls[0].init.method).toBe("DELETE");
    expect(calls[0].init.headers).toMatchObject({
      authorization: "Bearer some-token",
    });
  });

  it("comments.list parses a paginated comment list with Date coercion", async () => {
    const { fetchFn, calls } = mockFetch(() => ({
      status: 200,
      body: {
        comments: [
          {
            ...comment,
            children: [
              {
                ...createdReply,
                bodyMd: "A **reply**",
                children: [],
              },
            ],
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      },
    }));
    const client = createKoeClient({
      baseUrl: "http://localhost:3000",
      token: "default-token",
      fetch: fetchFn,
    });

    const result = await client.comments.list(thread.id, { page: 1, pageSize: 20 });

    expect(calls[0].url).toBe(
      `http://localhost:3000/api/v1/threads/${thread.id}/comments?page=1&pageSize=20`
    );
    expect(calls[0].init.headers).toMatchObject({
      authorization: "Bearer default-token",
    });
    expect(result.total).toBe(1);
    expect(result.comments).toHaveLength(1);
    expect(result.comments[0].bodyMd).toBe("Hello **world**");
    expect(result.comments[0].createdAt).toBeInstanceOf(Date);
    expect(result.comments[0].children).toHaveLength(1);
    expect(result.comments[0].children[0].parentId).toBe(comment.id);
    expect(result.comments[0].children[0].depth).toBe(1);
  });

  it("comments.create posts the body as JSON and parses the created comment", async () => {
    const { fetchFn, calls } = mockFetch(() => ({ status: 201, body: comment }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const result = await client.comments.create(
      thread.id,
      { bodyMd: "Hello **world**" },
      "some-token"
    );

    expect(calls[0].url).toBe(
      `http://localhost:3000/api/v1/threads/${thread.id}/comments`
    );
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.headers).toMatchObject({
      authorization: "Bearer some-token",
      "content-type": "application/json",
    });
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      bodyMd: "Hello **world**",
    });
    expect(result.status).toBe("pending");
    expect(result.id).toBe(comment.id);
  });

  it("comments.create forwards an optional parentId for replies", async () => {
    const { fetchFn, calls } = mockFetch(() => ({
      status: 201,
      body: createdReply,
    }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const result = await client.comments.create(
      thread.id,
      { bodyMd: "A reply", parentId: comment.id },
      "some-token"
    );

    expect(calls[0].init.method).toBe("POST");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      bodyMd: "A reply",
      parentId: comment.id,
    });
    expect(result.parentId).toBe(comment.id);
  });

  it("comments.vote posts the vote value and parses the vote", async () => {
    const { fetchFn, calls } = mockFetch(() => ({ status: 201, body: vote }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const result = await client.comments.vote(comment.id, 1, "some-token");

    expect(calls[0].url).toBe(
      `http://localhost:3000/api/v1/comments/${comment.id}/vote`
    );
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.headers).toMatchObject({
      authorization: "Bearer some-token",
      "content-type": "application/json",
    });
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ value: 1 });
    expect(result?.commentId).toBe(comment.id);
    expect(result?.value).toBe(1);
    expect(result?.createdAt).toBeInstanceOf(Date);
  });

  it("comments.vote returns null when the vote is toggled off (204)", async () => {
    const { fetchFn } = mockFetch(() => ({ status: 204, body: null }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const result = await client.comments.vote(comment.id, 1, "some-token");

    expect(result).toBeNull();
  });

  it("comments.unvote deletes the current user's vote", async () => {
    const { fetchFn, calls } = mockFetch(() => ({ status: 204, body: null }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    await client.comments.unvote(comment.id, "some-token");

    expect(calls[0].url).toBe(
      `http://localhost:3000/api/v1/comments/${comment.id}/vote`
    );
    expect(calls[0].init.method).toBe("DELETE");
    expect(calls[0].init.headers).toMatchObject({
      authorization: "Bearer some-token",
    });
  });

  it("comments.react posts the emoji and parses the reaction", async () => {
    const { fetchFn, calls } = mockFetch(() => ({
      status: 201,
      body: reaction,
    }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const result = await client.comments.react(comment.id, "👍", "some-token");

    expect(calls[0].url).toBe(
      `http://localhost:3000/api/v1/comments/${comment.id}/reactions`
    );
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.headers).toMatchObject({
      authorization: "Bearer some-token",
      "content-type": "application/json",
    });
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ emoji: "👍" });
    expect(result?.emoji).toBe("👍");
    expect(result?.targetId).toBe(comment.id);
    expect(result?.createdAt).toBeInstanceOf(Date);
  });

  it("comments.react returns null when the reaction is toggled off (204)", async () => {
    const { fetchFn } = mockFetch(() => ({ status: 204, body: null }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const result = await client.comments.react(comment.id, "👍", "some-token");

    expect(result).toBeNull();
  });

  it("comments.unreact deletes the reaction with an encoded emoji", async () => {
    const { fetchFn, calls } = mockFetch(() => ({ status: 204, body: null }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    await client.comments.unreact(comment.id, "👍", "some-token");

    expect(calls[0].url).toBe(
      `http://localhost:3000/api/v1/comments/${comment.id}/reactions/%F0%9F%91%8D`
    );
    expect(calls[0].init.method).toBe("DELETE");
    expect(calls[0].init.headers).toMatchObject({
      authorization: "Bearer some-token",
    });
  });

  it("comments.list parses the current user's reaction state per node", async () => {
    const { fetchFn } = mockFetch(() => ({
      status: 200,
      body: {
        comments: [{ ...comment, userReactions: ["👍"], children: [] }],
        total: 1,
        page: 1,
        pageSize: 20,
      },
    }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const result = await client.comments.list(thread.id);

    expect(result.comments[0].userReactions).toEqual(["👍"]);
  });

  it("comments.list parses the current user's vote state per node", async () => {
    const { fetchFn } = mockFetch(() => ({
      status: 200,
      body: {
        comments: [{ ...comment, userVote: 1, children: [] }],
        total: 1,
        page: 1,
        pageSize: 20,
      },
    }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const result = await client.comments.list(thread.id);

    expect(result.comments[0].userVote).toBe(1);
  });

  it("moderation.queue gets the pending queue and parses thread and author context", async () => {
    const { fetchFn, calls } = mockFetch(() => ({
      status: 200,
      body: { comments: [moderationQueueItem] },
    }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const result = await client.moderation.queue("some-token");

    expect(calls[0].url).toBe("http://localhost:3000/api/v1/moderation/queue");
    expect(calls[0].init.method).toBe("GET");
    expect(calls[0].init.headers).toMatchObject({
      authorization: "Bearer some-token",
    });
    expect(result.comments).toHaveLength(1);
    expect(result.comments[0].bodyMd).toBe("Hello **world**");
    expect(result.comments[0].thread.externalRef).toBe("my-post");
    expect(result.comments[0].thread.id).toBe(thread.id);
    expect(result.comments[0].authorName).toBe("Alice");
    expect(result.comments[0].createdAt).toBeInstanceOf(Date);
  });

  it("moderation.act posts the action and parses the updated comment", async () => {
    const { fetchFn, calls } = mockFetch(() => ({
      status: 200,
      body: { ...comment, status: "published", children: [] },
    }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const result = await client.moderation.act(comment.id, "approve", "some-token");

    expect(calls[0].url).toBe("http://localhost:3000/api/v1/moderation/actions");
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.headers).toMatchObject({
      authorization: "Bearer some-token",
      "content-type": "application/json",
    });
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      commentId: comment.id,
      action: "approve",
    });
    expect(result.status).toBe("published");
    expect(result.id).toBe(comment.id);
  });

  it("moderation.suspend posts a suspend action and parses the updated user", async () => {
    const { fetchFn, calls } = mockFetch(() => ({
      status: 200,
      body: { ...guestUser, status: "suspended" },
    }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const result = await client.moderation.suspend(guestUser.id, "some-token");

    expect(calls[0].url).toBe("http://localhost:3000/api/v1/moderation/actions");
    expect(calls[0].init.method).toBe("POST");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      userId: guestUser.id,
      action: "suspend",
    });
    expect(result.status).toBe("suspended");
  });

  it("moderation.ban posts a ban action and parses the updated user", async () => {
    const { fetchFn, calls } = mockFetch(() => ({
      status: 200,
      body: { ...guestUser, status: "banned" },
    }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const result = await client.moderation.ban(guestUser.id, "some-token");

    expect(calls[0].url).toBe("http://localhost:3000/api/v1/moderation/actions");
    expect(calls[0].init.method).toBe("POST");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      userId: guestUser.id,
      action: "ban",
    });
    expect(result.status).toBe("banned");
  });

  it("comments.report posts the reason and parses the created report", async () => {
    const { fetchFn, calls } = mockFetch(() => ({ status: 201, body: report }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const result = await client.comments.report(
      comment.id,
      "abusive language",
      "some-token"
    );

    expect(calls[0].url).toBe(
      `http://localhost:3000/api/v1/comments/${comment.id}/reports`
    );
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.headers).toMatchObject({
      authorization: "Bearer some-token",
      "content-type": "application/json",
    });
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      reason: "abusive language",
    });
    expect(result.commentId).toBe(comment.id);
    expect(result.status).toBe("open");
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("moderation.actions fetches the audit log", async () => {
    const { fetchFn, calls } = mockFetch(() => ({
      status: 200,
      body: { actions: [moderationAction] },
    }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const result = await client.moderation.actions("some-token");

    expect(calls[0].url).toBe("http://localhost:3000/api/v1/moderation/actions");
    expect(calls[0].init.method).toBe("GET");
    expect(calls[0].init.headers).toMatchObject({
      authorization: "Bearer some-token",
    });
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].action).toBe("approve");
    expect(result.actions[0].targetType).toBe("comment");
    expect(result.actions[0].actorName).toBe("Alice");
    expect(result.actions[0].createdAt).toBeInstanceOf(Date);
  });

  it("throws KoeApiError with problem details on a non-ok response", async () => {
    const { fetchFn } = mockFetch(() => ({
      status: 404,
      body: {
        type: "about:blank",
        title: "Not Found",
        status: 404,
        detail: "Thread does not exist",
      },
    }));
    const client = createKoeClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const promise = client.comments.list(thread.id);

    await expect(promise).rejects.toBeInstanceOf(KoeApiError);
    await expect(promise).rejects.toMatchObject({
      status: 404,
      title: "Not Found",
      detail: "Thread does not exist",
    });
  });
});