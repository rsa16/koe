import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { FastifyInstance } from "fastify";
import { createMemDb } from "@koe/db";
import { DomainEvent } from "@koe/core";
import { buildApp } from "../src/app.js";
import { OAuthProfile, OAuthProvider } from "../src/oauth.js";

const jwtSecret = "test-jwt-secret-at-least-32-chars-long";
const webhookSecret = "identity-linked-webhook-secret";

const GOOGLE_PROFILE: OAuthProfile = {
  sub: "google-sub-123",
  email: "alice@example.com",
  name: "Alice Example",
  picture: "https://example.com/alice.png",
};

const DISCORD_PROFILE: OAuthProfile = {
  sub: "discord-user-123",
  email: null,
  name: "Alice On Discord",
  picture: null,
};

/** Fake provider returning a fixed profile; only the OAuth seam is faked. */
function createFakeProvider(profile: OAuthProfile): OAuthProvider {
  return {
    createAuthorizationURL(state, codeVerifier, scopes): URL {
      const url = new URL("https://accounts.example.com/o/oauth2/v2/auth");
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", codeVerifier);
      url.searchParams.set("scope", scopes.join(" "));
      return url;
    },
    async validateAuthorizationCode(): Promise<OAuthProfile> {
      return profile;
    },
  };
}

interface CapturedDelivery {
  body: string;
  headers: Record<string, string>;
}

function parseOAuthResult(html: string): { type: string; [key: string]: unknown } {
  const match = html.match(/id="koe-oauth-result" type="application\/json">(.*?)<\/script>/s);
  if (!match) {
    throw new Error(`No oauth result found in HTML:\n${html}`);
  }
  return JSON.parse(match[1]);
}

describe("identity.linked domain event (API seam)", () => {
  let app: FastifyInstance;
  let deliveries: CapturedDelivery[];

  beforeEach(async () => {
    const { db } = await createMemDb();
    deliveries = [];
    app = buildApp({
      db,
      jwtSecret,
      logger: false,
      googleOAuth: createFakeProvider(GOOGLE_PROFILE),
      discordOAuth: createFakeProvider(DISCORD_PROFILE),
      clientOrigin: "http://localhost:5173",
      webhookSubscriptions: [
        {
          url: "http://identity-linked.test/hook",
          secret: webhookSecret,
          events: ["identity.linked"],
          active: true,
        },
      ],
      fetchImpl: async (_url, init) => {
        deliveries.push({ body: init.body, headers: init.headers });
        return { ok: true, status: 204 };
      },
    });
    await app.ready();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  async function startOAuthFlow(provider: string, guestUserId?: string) {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/auth/oauth/${provider}${guestUserId ? `?guestUserId=${guestUserId}` : ""}`,
    });
    expect(res.statusCode).toBe(302);
    const state = new URL(res.headers.location as string).searchParams.get("state");
    expect(state).toBeTruthy();
    const stateCookie = res.cookies.find((cookie) => cookie.name === "koe_oauth_state");
    expect(stateCookie).toBeDefined();
    return { state: state as string, stateCookie: stateCookie!.value };
  }

  async function completeOAuthFlow(provider: string, state: string, stateCookie: string) {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/auth/oauth/${provider}/callback?code=auth-code-123&state=${state}`,
      cookies: { koe_oauth_state: stateCookie },
    });
    expect(res.statusCode).toBe(200);
    return parseOAuthResult(res.body) as { user: { id: string } };
  }

  /** Flushes pending deliveries and returns the identity.linked events delivered since the last read. */
  async function linkedEvents(): Promise<DomainEvent[]> {
    await app.webhooks.flush();
    const events = deliveries.map((delivery) => JSON.parse(delivery.body) as DomainEvent);
    deliveries.length = 0;
    return events.filter((event) => event.type === "identity.linked");
  }

  async function anonymousGuest(): Promise<{ id: string }> {
    const res = await app.inject({ method: "POST", url: "/api/v1/auth/anonymous" });
    expect(res.statusCode).toBe(200);
    return res.json().user as { id: string };
  }

  it("emits identity.linked once for a new Identity and names the user, provider and provider user id", async () => {
    const flow = await startOAuthFlow("google");
    const result = await completeOAuthFlow("google", flow.state, flow.stateCookie);

    const events = await linkedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("identity.linked");
    expect(events[0].data).toEqual({
      userId: result.user.id,
      provider: "google",
      providerUserId: "google-sub-123",
    });
  });

  it("delivers identity.linked through the existing signed webhook scheme", async () => {
    const flow = await startOAuthFlow("google");
    await completeOAuthFlow("google", flow.state, flow.stateCookie);
    await app.webhooks.flush();

    expect(deliveries).toHaveLength(1);
    const [delivery] = deliveries;
    expect(delivery.headers["x-koe-event"]).toBe("identity.linked");
    // Verify against the documented scheme independently of the implementation.
    const expectedSignature = `sha256=${createHmac("sha256", webhookSecret)
      .update(delivery.body)
      .digest("hex")}`;
    expect(delivery.headers["x-koe-signature"]).toBe(expectedSignature);
    expect(delivery.headers["x-koe-delivery"]).toBe(
      (JSON.parse(delivery.body) as DomainEvent).id
    );
  });

  it("does not emit again when a login reuses an already-linked Identity", async () => {
    const first = await startOAuthFlow("google");
    await completeOAuthFlow("google", first.state, first.stateCookie);
    expect(await linkedEvents()).toHaveLength(1);

    const second = await startOAuthFlow("google");
    await completeOAuthFlow("google", second.state, second.stateCookie);

    expect(await linkedEvents()).toHaveLength(0);
  });

  it("does not emit for the anonymous Identity created by a guest login", async () => {
    await anonymousGuest();
    expect(await linkedEvents()).toHaveLength(0);
  });

  it("names the guest User when a guest is claimed by a new Identity", async () => {
    const guest = await anonymousGuest();

    const flow = await startOAuthFlow("google", guest.id);
    const result = await completeOAuthFlow("google", flow.state, flow.stateCookie);
    expect(result.user.id).toBe(guest.id);

    const events = await linkedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual({
      userId: guest.id,
      provider: "google",
      providerUserId: "google-sub-123",
    });
  });

  it("does not emit when a guest is merged into an account whose Identity was already linked", async () => {
    const first = await startOAuthFlow("google");
    const existing = await completeOAuthFlow("google", first.state, first.stateCookie);
    await linkedEvents();

    const guest = await anonymousGuest();

    const merge = await startOAuthFlow("google", guest.id);
    const result = await completeOAuthFlow("google", merge.state, merge.stateCookie);
    expect(result.user.id).toBe(existing.user.id);
    expect(result.user.id).not.toBe(guest.id);

    expect(await linkedEvents()).toHaveLength(0);
  });

  it("names the provider that was linked rather than assuming one", async () => {
    const flow = await startOAuthFlow("discord");
    const result = await completeOAuthFlow("discord", flow.state, flow.stateCookie);

    const events = await linkedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual({
      userId: result.user.id,
      provider: "discord",
      providerUserId: "discord-user-123",
    });
  });
});
