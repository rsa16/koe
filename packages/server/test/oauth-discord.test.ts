import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb } from "@koe/db";
import { FastifyInstance } from "fastify";
import { DiscordOAuthProvider, DiscordUserInfo } from "../src/oauth.js";

function createFakeDiscordProvider(
  profile: DiscordUserInfo | ((code: string) => DiscordUserInfo),
  options?: { reject?: boolean }
): DiscordOAuthProvider {
  return {
    createAuthorizationURL(state: string, codeVerifier: string, scopes: string[]): URL {
      const url = new URL("https://discord.com/oauth2/authorize");
      url.searchParams.set("client_id", "fake-client-id");
      url.searchParams.set("redirect_uri", "http://localhost:3000/api/v1/auth/oauth/discord/callback");
      url.searchParams.set("response_type", "code");
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", codeVerifier);
      url.searchParams.set("scope", scopes.join(" "));
      return url;
    },
    async validateAuthorizationCode(code: string, _codeVerifier: string): Promise<DiscordUserInfo> {
      if (options?.reject) {
        throw new Error("Invalid authorization code");
      }
      return typeof profile === "function" ? profile(code) : profile;
    },
  };
}

const DISCORD_PROFILE: DiscordUserInfo = {
  sub: "discord-user-123",
  email: "alice@example.com",
  name: "Alice Example",
  picture: "https://cdn.discordapp.com/avatars/discord-user-123/hash.png",
};

function parseOAuthResult(html: string): { type: string; [key: string]: unknown } {
  const match = html.match(/id="koe-oauth-result" type="application\/json">(.*?)<\/script>/s);
  if (!match) {
    throw new Error(`No oauth result found in HTML:\n${html}`);
  }
  return JSON.parse(match[1]);
}

describe("Discord OAuth API Seam Integration Tests", () => {
  let app: FastifyInstance;
  const jwtSecret = "test-jwt-secret-at-least-32-chars-long";

  beforeEach(async () => {
    const { db } = await createMemDb();
    app = buildApp({
      db,
      jwtSecret,
      logger: false,
      discordOAuth: createFakeDiscordProvider(DISCORD_PROFILE),
      clientOrigin: "http://localhost:5173",
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  async function startOAuthFlow(guestUserId?: string) {
    const startRes = await app.inject({
      method: "GET",
      url: `/api/v1/auth/oauth/discord${guestUserId ? `?guestUserId=${guestUserId}` : ""}`,
    });
    expect(startRes.statusCode).toBe(302);
    const state = new URL(startRes.headers.location as string).searchParams.get("state");
    expect(state).toBeTruthy();
    const stateCookie = startRes.cookies.find((c) => c.name === "koe_oauth_state");
    expect(stateCookie).toBeDefined();
    expect(stateCookie?.httpOnly).toBe(true);
    expect(stateCookie?.sameSite.toLowerCase()).toBe("lax");
    return { state, stateCookie };
  }

  async function completeOAuthFlow(state: string, stateCookieValue: string, code = "auth-code-123") {
    return app.inject({
      method: "GET",
      url: `/api/v1/auth/oauth/discord/callback?code=${code}&state=${state}`,
      cookies: { koe_oauth_state: stateCookieValue },
    });
  }

  it("GET /api/v1/auth/oauth/discord redirects to Discord with a signed state cookie", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/oauth/discord",
    });

    expect(res.statusCode).toBe(302);
    const location = res.headers.location as string;
    expect(location.startsWith("https://discord.com/")).toBe(true);
    expect(new URL(location).searchParams.get("scope")).toContain("identify");
    expect(new URL(location).searchParams.get("scope")).toContain("email");
  });

  it("creates a member User linked to the Discord identity when no guest is present", async () => {
    const { state, stateCookie } = await startOAuthFlow();
    const res = await completeOAuthFlow(state, stateCookie?.value as string);

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    const result = parseOAuthResult(res.body);
    expect(result.type).toBe("koe:oauth:success");
    const payload = result as {
      accessToken: string;
      user: { id: string; role: string; name: string | null; email: string | null };
    };
    expect(payload.accessToken).toBeDefined();
    expect(payload.user.role).toBe("member");
    expect(payload.user.name).toBe("Alice Example");
    expect(payload.user.email).toBe("alice@example.com");

    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${payload.accessToken}` },
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json().id).toBe(payload.user.id);
  });

  it("links the Discord identity to the guest User row when a guest session is present", async () => {
    const anonRes = await app.inject({ method: "POST", url: "/api/v1/auth/anonymous" });
    const { user: guest } = anonRes.json();

    const { state, stateCookie } = await startOAuthFlow(guest.id);
    const res = await completeOAuthFlow(state, stateCookie?.value as string);

    expect(res.statusCode).toBe(200);
    const result = parseOAuthResult(res.body) as {
      accessToken: string;
      user: { id: string; role: string };
    };
    expect(result.user.id).toBe(guest.id);
    expect(result.user.role).toBe("member");

    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${result.accessToken}` },
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json().id).toBe(guest.id);
    expect(meRes.json().role).toBe("member");
  });

  it("returns the same member for repeated logins with the same Discord account", async () => {
    const firstFlow = await startOAuthFlow();
    const firstRes = await completeOAuthFlow(firstFlow.state, firstFlow.stateCookie?.value as string);
    const firstUser = (parseOAuthResult(firstRes.body) as { user: { id: string } }).user;

    const secondFlow = await startOAuthFlow();
    const secondRes = await completeOAuthFlow(secondFlow.state, secondFlow.stateCookie?.value as string);
    const secondUser = (parseOAuthResult(secondRes.body) as { user: { id: string } }).user;

    expect(secondUser.id).toBe(firstUser.id);
  });

  it("renders an error page when the authorization code exchange fails", async () => {
    const { db } = await createMemDb();
    await app.close();
    app = buildApp({
      db,
      jwtSecret,
      logger: false,
      discordOAuth: createFakeDiscordProvider(DISCORD_PROFILE, { reject: true }),
      clientOrigin: "http://localhost:5173",
    });
    await app.ready();

    const { state, stateCookie } = await startOAuthFlow();
    const res = await completeOAuthFlow(state, stateCookie?.value as string);

    expect(res.statusCode).toBe(400);
    const result = parseOAuthResult(res.body);
    expect(result.type).toBe("koe:oauth:error");
  });

  it("rejects a state minted for a different provider", async () => {
    const { db } = await createMemDb();
    await app.close();
    app = buildApp({
      db,
      jwtSecret,
      logger: false,
      discordOAuth: createFakeDiscordProvider(DISCORD_PROFILE),
      googleOAuth: {
        createAuthorizationURL(state: string, _codeVerifier: string, scopes: string[]): URL {
          const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
          url.searchParams.set("state", state);
          url.searchParams.set("scope", scopes.join(" "));
          return url;
        },
        async validateAuthorizationCode(): Promise<DiscordUserInfo> {
          return DISCORD_PROFILE;
        },
      },
      clientOrigin: "http://localhost:5173",
    });
    await app.ready();

    const startRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/oauth/google",
    });
    expect(startRes.statusCode).toBe(302);
    const state = new URL(startRes.headers.location as string).searchParams.get("state");
    const stateCookie = startRes.cookies.find((c) => c.name === "koe_oauth_state");

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/auth/oauth/discord/callback?code=auth-code-123&state=${state}`,
      cookies: { koe_oauth_state: stateCookie?.value as string },
    });

    expect(res.statusCode).toBe(400);
    const result = parseOAuthResult(res.body);
    expect(result.type).toBe("koe:oauth:error");
    expect((result as { error: { message: string } }).error.message).toContain("state");
  });

  it("returns 503 Problem Details when Discord OAuth is not configured", async () => {
    const { db } = await createMemDb();
    await app.close();
    app = buildApp({ db, jwtSecret, logger: false });
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/oauth/discord",
    });

    expect(res.statusCode).toBe(503);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = res.json();
    expect(body.status).toBe(503);
    expect(body.title).toBe("Service Unavailable");

    const callbackRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/oauth/discord/callback?code=some-code&state=some-state",
    });
    expect(callbackRes.statusCode).toBe(503);
    expect(callbackRes.headers["content-type"]).toContain("text/html");
  });
});
