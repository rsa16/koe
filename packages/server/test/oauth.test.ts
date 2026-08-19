import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/app.js";
import { createMemDb } from "@koe/db";
import { FastifyInstance } from "fastify";
import { GoogleOAuthProvider, GoogleUserInfo } from "../src/oauth.js";

function createFakeGoogleProvider(
  profile: GoogleUserInfo | ((code: string) => GoogleUserInfo),
  options?: { reject?: boolean }
): GoogleOAuthProvider {
  return {
    createAuthorizationURL(state: string, codeVerifier: string, scopes: string[]): URL {
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.searchParams.set("client_id", "fake-client-id");
      url.searchParams.set("redirect_uri", "http://localhost:3000/api/v1/auth/oauth/google/callback");
      url.searchParams.set("response_type", "code");
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", codeVerifier);
      url.searchParams.set("scope", scopes.join(" "));
      return url;
    },
    async validateAuthorizationCode(code: string, _codeVerifier: string): Promise<GoogleUserInfo> {
      if (options?.reject) {
        throw new Error("Invalid authorization code");
      }
      return typeof profile === "function" ? profile(code) : profile;
    },
  };
}

const GOOGLE_PROFILE: GoogleUserInfo = {
  sub: "google-sub-123",
  email: "alice@example.com",
  name: "Alice Example",
  picture: "https://example.com/alice.png",
};

function parseOAuthResult(html: string): { type: string; [key: string]: unknown } {
  const match = html.match(/id="koe-oauth-result" type="application\/json">(.*?)<\/script>/s);
  if (!match) {
    throw new Error(`No oauth result found in HTML:\n${html}`);
  }
  return JSON.parse(match[1]);
}

describe("Google OAuth API Seam Integration Tests", () => {
  let app: FastifyInstance;
  const jwtSecret = "test-jwt-secret-at-least-32-chars-long";

  beforeEach(async () => {
    const { db } = await createMemDb();
    app = buildApp({
      db,
      jwtSecret,
      logger: false,
      googleOAuth: createFakeGoogleProvider(GOOGLE_PROFILE),
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
      url: `/api/v1/auth/oauth/google${guestUserId ? `?guestUserId=${guestUserId}` : ""}`,
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
      url: `/api/v1/auth/oauth/google/callback?code=${code}&state=${state}`,
      cookies: { koe_oauth_state: stateCookieValue },
    });
  }

  it("GET /api/v1/auth/oauth/google redirects to Google with a signed state cookie", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/oauth/google",
    });

    expect(res.statusCode).toBe(302);
    const location = res.headers.location as string;
    expect(location.startsWith("https://accounts.google.com/")).toBe(true);
    expect(new URL(location).searchParams.get("scope")).toContain("openid");
    expect(new URL(location).searchParams.get("scope")).toContain("email");
    expect(new URL(location).searchParams.get("scope")).toContain("profile");
  });

  it("creates a member User linked to the Google identity when no guest is present", async () => {
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

  it("links the Google identity to the guest User row when a guest session is present", async () => {
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

  it("merges a guest User into an existing Google account and preserves its session", async () => {
    const firstFlow = await startOAuthFlow();
    const firstRes = await completeOAuthFlow(firstFlow.state, firstFlow.stateCookie?.value as string);
    const firstPayload = parseOAuthResult(firstRes.body) as {
      accessToken: string;
      user: { id: string };
    };

    const anonRes = await app.inject({ method: "POST", url: "/api/v1/auth/anonymous" });
    const { user: guest, accessToken: guestToken } = anonRes.json();

    const secondFlow = await startOAuthFlow(guest.id);
    const secondRes = await completeOAuthFlow(secondFlow.state, secondFlow.stateCookie?.value as string);

    expect(secondRes.statusCode).toBe(200);
    const secondPayload = parseOAuthResult(secondRes.body) as {
      accessToken: string;
      user: { id: string };
    };
    expect(secondPayload.user.id).toBe(firstPayload.user.id);
    expect(secondPayload.user.id).not.toBe(guest.id);

    const oldGuestMe = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${guestToken}` },
    });
    expect(oldGuestMe.statusCode).toBe(401);

    const mergedMe = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${secondPayload.accessToken}` },
    });
    expect(mergedMe.statusCode).toBe(200);
    expect(mergedMe.json().id).toBe(firstPayload.user.id);
  });

  it("returns the same member for repeated logins with the same Google account", async () => {
    const firstFlow = await startOAuthFlow();
    const firstRes = await completeOAuthFlow(firstFlow.state, firstFlow.stateCookie?.value as string);
    const firstUser = (parseOAuthResult(firstRes.body) as { user: { id: string } }).user;

    const secondFlow = await startOAuthFlow();
    const secondRes = await completeOAuthFlow(secondFlow.state, secondFlow.stateCookie?.value as string);
    const secondUser = (parseOAuthResult(secondRes.body) as { user: { id: string } }).user;

    expect(secondUser.id).toBe(firstUser.id);
  });

  it("renders an error page when the state does not match", async () => {
    const { state, stateCookie } = await startOAuthFlow();
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/auth/oauth/google/callback?code=auth-code-123&state=wrong-state`,
      cookies: { koe_oauth_state: stateCookie?.value as string },
    });

    expect(res.statusCode).toBe(400);
    const result = parseOAuthResult(res.body);
    expect(result.type).toBe("koe:oauth:error");
    expect((result as { error: { message: string } }).error.message).toContain("state");
  });

  it("renders an error page when the state cookie is missing", async () => {
    const { state } = await startOAuthFlow();
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/auth/oauth/google/callback?code=auth-code-123&state=${state}`,
    });

    expect(res.statusCode).toBe(400);
    const result = parseOAuthResult(res.body);
    expect(result.type).toBe("koe:oauth:error");
  });

  it("renders an error page when the authorization code exchange fails", async () => {
    const { db } = await createMemDb();
    await app.close();
    app = buildApp({
      db,
      jwtSecret,
      logger: false,
      googleOAuth: createFakeGoogleProvider(GOOGLE_PROFILE, { reject: true }),
      clientOrigin: "http://localhost:5173",
    });
    await app.ready();

    const { state, stateCookie } = await startOAuthFlow();
    const res = await completeOAuthFlow(state, stateCookie?.value as string);

    expect(res.statusCode).toBe(400);
    const result = parseOAuthResult(res.body);
    expect(result.type).toBe("koe:oauth:error");
  });

  it("does not merge a non-guest User into another Google account", async () => {
    const memberProfile = { ...GOOGLE_PROFILE, sub: "member-sub", name: "Member Alice" };
    const attackerProfile = { ...GOOGLE_PROFILE, sub: "attacker-sub", name: "Bob Attacker" };

    const { db } = await createMemDb();
    await app.close();
    app = buildApp({
      db,
      jwtSecret,
      logger: false,
      googleOAuth: createFakeGoogleProvider((code) =>
        code === "member-code" ? memberProfile : attackerProfile
      ),
      clientOrigin: "http://localhost:5173",
    });
    await app.ready();

    const memberFlow = await startOAuthFlow();
    const memberRes = await completeOAuthFlow(memberFlow.state, memberFlow.stateCookie?.value as string, "member-code");
    const member = parseOAuthResult(memberRes.body) as {
      accessToken: string;
      user: { id: string };
    };

    const attackFlow = await startOAuthFlow(member.user.id);
    const attackRes = await completeOAuthFlow(attackFlow.state, attackFlow.stateCookie?.value as string, "attacker-code");
    const attackPayload = parseOAuthResult(attackRes.body) as {
      accessToken: string;
      user: { id: string };
    };

    expect(attackPayload.user.id).not.toBe(member.user.id);

    const memberStillExists = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${member.accessToken}` },
    });
    expect(memberStillExists.statusCode).toBe(200);
    expect(memberStillExists.json().id).toBe(member.user.id);
  });

  it("returns 503 Problem Details when Google OAuth is not configured", async () => {
    const { db } = await createMemDb();
    await app.close();
    app = buildApp({ db, jwtSecret, logger: false });
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/oauth/google",
    });

    expect(res.statusCode).toBe(503);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = res.json();
    expect(body.status).toBe(503);
    expect(body.title).toBe("Service Unavailable");

    const callbackRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/oauth/google/callback?code=some-code&state=some-state",
    });
    expect(callbackRes.statusCode).toBe(503);
    expect(callbackRes.headers["content-type"]).toContain("text/html");
  });
});
