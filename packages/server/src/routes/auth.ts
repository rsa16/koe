import {
  DEFAULT_OAUTH_STATE_MAX_AGE_SECONDS,
  signAccessToken,
  signOAuthState,
  verifyOAuthState,
} from "@koe/auth";
import {
  AnonymousAuthResponseSchema,
  IdentityProvider,
  OAuthCallbackQuerySchema,
  OAuthCallbackResponseSchema,
  OAuthStartQuerySchema,
  UpdateProfileBodySchema,
  User,
  UserSchema,
} from "@koe/core";
import { Database, identities, users } from "@koe/db";
import { eq } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import crypto from "node:crypto";
import { renderOAuthSuccessPage, sendOAuthErrorPage } from "../oauth-render.js";
import {
  DISCORD_OAUTH_SCOPES,
  DiscordOAuthProvider,
  GOOGLE_OAUTH_SCOPES,
  GoogleOAuthProvider,
  OAuthProvider,
  generateCodeVerifier,
  generateState,
} from "../oauth.js";
import { resolveOAuthUser } from "../user-accounts.js";

const OAUTH_STATE_COOKIE = "koe_oauth_state";

export interface AuthRoutesOptions {
  db: Database;
  jwtSecret: string;
  clientOrigin: string;
  googleOAuth?: GoogleOAuthProvider;
  discordOAuth?: DiscordOAuthProvider;
}

interface OAuthProviderRoutes {
  /** The Identity provider this route pair serves; also the URL segment. */
  provider: IdentityProvider;
  /** Human-readable name for error messages. */
  displayName: string;
  /** Absent when the provider is not configured; routes then answer 503. */
  oauth?: OAuthProvider;
  scopes: string[];
}

export default async function authRoutes(
  app: FastifyInstance,
  options: AuthRoutesOptions
) {
  const { db, jwtSecret, clientOrigin, googleOAuth, discordOAuth } = options;

  const oauthStateCookieAttributes = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: DEFAULT_OAUTH_STATE_MAX_AGE_SECONDS,
  };

  // Auth: Anonymous guest login
  // POST /api/v1/auth/anonymous
  const anonymousHandler = async (
    _request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const guestUuid = crypto.randomUUID();
    const [userRow] = await db
      .insert(users)
      .values({
        role: "guest",
        status: "active",
        metadata: {},
      })
      .returning();

    await db.insert(identities).values({
      userId: userRow.id,
      provider: "anonymous",
      providerUserId: `guest-${guestUuid}`,
      profileData: {},
    });

    const user = UserSchema.parse(userRow);
    const accessToken = await signAccessToken(
      { userId: user.id, role: user.role },
      { secret: jwtSecret, expiresIn: "15m" }
    );

    return reply
      .status(200)
      .send(AnonymousAuthResponseSchema.parse({ accessToken, user }));
  };

  // Auth: Current user profile
  // GET /api/v1/auth/me
  const meHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send(UserSchema.parse(request.user));
  };

  // Auth: Update current user profile (name and/or avatar)
  // PATCH /api/v1/auth/me
  const updateMeHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const bodyParsed = UpdateProfileBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid profile update body",
        request.url,
        bodyParsed.error.issues
      );
    }

    const user = request.user;
    if (!user) {
      return app.sendProblem(
        reply,
        401,
        "Unauthorized",
        "Authentication required",
        request.url
      );
    }

    const { name, avatarUrl } = bodyParsed.data;
    const update: {
      name?: string | null;
      avatarUrl?: string | null;
      updatedAt: Date;
    } = { updatedAt: new Date() };
    if (name !== undefined) update.name = name;
    if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;

    const [updated] = await db
      .update(users)
      .set(update)
      .where(eq(users.id, user.id))
      .returning();

    return reply.status(200).send(UserSchema.parse(updated));
  };

  // Auth: OAuth start + callback, registered once per provider.
  function registerOAuthProvider(routes: OAuthProviderRoutes) {
    const { provider, displayName, oauth, scopes } = routes;

    const startHandler = async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      if (!oauth) {
        return app.sendProblem(
          reply,
          503,
          "Service Unavailable",
          `${displayName} OAuth is not configured`,
          request.url
        );
      }

      const queryParsed = OAuthStartQuerySchema.safeParse(request.query);
      if (!queryParsed.success) {
        return app.sendProblem(
          reply,
          400,
          "Bad Request",
          "Invalid OAuth query parameters",
          request.url,
          queryParsed.error.issues
        );
      }
      const { guestUserId } = queryParsed.data;

      const state = generateState();
      const codeVerifier = generateCodeVerifier();
      const authorizationUrl = oauth.createAuthorizationURL(
        state,
        codeVerifier,
        scopes
      );
      const stateToken = await signOAuthState(
        { state, codeVerifier, provider, guestUserId },
        jwtSecret
      );

      reply.setCookie(
        OAUTH_STATE_COOKIE,
        stateToken,
        oauthStateCookieAttributes
      );
      return reply.redirect(authorizationUrl.toString());
    };

    const callbackHandler = async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const clearStateCookie = () =>
        reply.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });

      if (!oauth) {
        return sendOAuthErrorPage(
          reply,
          `${displayName} OAuth is not configured`,
          clientOrigin,
          503
        );
      }

      const queryParsed = OAuthCallbackQuerySchema.safeParse(request.query);
      if (!queryParsed.success) {
        return sendOAuthErrorPage(
          reply,
          "Invalid OAuth callback parameters",
          clientOrigin
        );
      }
      const { code, state } = queryParsed.data;

      const stateToken = request.cookies[OAUTH_STATE_COOKIE];
      const oauthState = stateToken
        ? await verifyOAuthState(stateToken, jwtSecret)
        : null;

      if (!oauthState || oauthState.state !== state || oauthState.provider !== provider) {
        clearStateCookie();
        return sendOAuthErrorPage(
          reply,
          "Invalid or expired OAuth state",
          clientOrigin
        );
      }

      let profile;
      try {
        profile = await oauth.validateAuthorizationCode(
          code,
          oauthState.codeVerifier
        );
      } catch {
        clearStateCookie();
        return sendOAuthErrorPage(
          reply,
          "Failed to exchange the authorization code",
          clientOrigin
        );
      }

      let user: User;
      let accessToken: string;
      try {
        user = await resolveOAuthUser(db, provider, profile, oauthState.guestUserId);
        accessToken = await signAccessToken(
          { userId: user.id, role: user.role },
          { secret: jwtSecret, expiresIn: "15m" }
        );
      } catch {
        clearStateCookie();
        return sendOAuthErrorPage(
          reply,
          "Failed to resolve the user account",
          clientOrigin
        );
      }

      clearStateCookie();
      const payload = OAuthCallbackResponseSchema.parse({ accessToken, user });
      return reply
        .type("text/html")
        .send(renderOAuthSuccessPage(payload, clientOrigin));
    };

    app.get(`/api/v1/auth/oauth/${provider}`, startHandler);
    app.get(`/api/v1/auth/oauth/${provider}/callback`, callbackHandler);
  }

  app.post("/api/v1/auth/anonymous", anonymousHandler);
  app.get("/api/v1/auth/me", { preHandler: app.authenticate }, meHandler);
  app.patch(
    "/api/v1/auth/me",
    { preHandler: app.authenticate },
    updateMeHandler
  );

  registerOAuthProvider({
    provider: "google",
    displayName: "Google",
    oauth: googleOAuth,
    scopes: GOOGLE_OAUTH_SCOPES,
  });
  registerOAuthProvider({
    provider: "discord",
    displayName: "Discord",
    oauth: discordOAuth,
    scopes: DISCORD_OAUTH_SCOPES,
  });
}
