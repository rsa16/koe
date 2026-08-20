import { describe, it, expect } from "vitest";
import { createKoeClient, KoeApiError } from "../src/index.js";

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
};

interface RecordedRequest {
  url: string;
  init: RequestInit;
}

function mockFetch(
  handler: (url: string, init: RequestInit) => { status: number; body: unknown }
) {
  const calls: RecordedRequest[] = [];
  const fetchFn: typeof globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    const resolvedInit = init ?? {};
    calls.push({ url, init: resolvedInit });
    const result = handler(url, resolvedInit);
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetchFn, calls };
}

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

  it("comments.list parses a paginated comment list with Date coercion", async () => {
    const { fetchFn, calls } = mockFetch(() => ({
      status: 200,
      body: { comments: [comment], total: 1, page: 1, pageSize: 20 },
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