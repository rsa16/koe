import {
  DEFAULT_OAUTH_STATE_MAX_AGE_SECONDS,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiresAt,
  signAccessToken,
  signOAuthState,
  verifyOAuthState,
} from "@koe/auth";
import {
  AuthTokenResponseSchema,
  IdentityProvider,
  OAuthCallbackQuerySchema,
  OAuthCallbackResponseSchema,
  OAuthStartQuerySchema,
  RefreshTokenBodySchema,
  Session,
  UpdateProfileBodySchema,
  User,
  UserSchema,
} from "@koe/core";
import { Database, identities, sessions, users } from "@koe/db";
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
  /** Refresh-token lifetime; overridable mainly so tests can force expiry. */
  refreshTokenMaxAgeSeconds?: number;
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
  const {
    db,
    jwtSecret,
    clientOrigin,
    googleOAuth,
    discordOAuth,
    refreshTokenMaxAgeSeconds,
  } = options;

  const oauthStateCookieAttributes = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: DEFAULT_OAUTH_STATE_MAX_AGE_SECONDS,
  };

  async function issueAccessToken(user: User): Promise<string> {
    return signAccessToken(
      { userId: user.id, role: user.role },
      { secret: jwtSecret, expiresIn: "15m" }
    );
  }

  /** Mints and persists a new refresh token for a user, returning the plaintext once. */
  async function issueRefreshToken(userId: string): Promise<string> {
    const refreshToken = generateRefreshToken();
    await db.insert(sessions).values({
      userId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshTokenExpiresAt(refreshTokenMaxAgeSeconds),
    });
    return refreshToken;
  }

  /**
   * Replaces a session's refresh token, remembering the spent hash. A later
   * presentation of that spent hash is treated as reuse (the token leaked) and
   * revokes the session.
   */
  async function rotateRefreshToken(session: Session): Promise<string> {
    const refreshToken = generateRefreshToken();
    await db
      .update(sessions)
      .set({
        refreshTokenHash: hashRefreshToken(refreshToken),
        previousRefreshTokenHash: session.refreshTokenHash,
        expiresAt: refreshTokenExpiresAt(refreshTokenMaxAgeSeconds),
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, session.id));
    return refreshToken;
  }

  /** Mints a short-lived access token plus a persisted, opaque refresh token. */
  async function issueTokens(
    user: User
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return {
      accessToken: await issueAccessToken(user),
      refreshToken: await issueRefreshToken(user.id),
    };
  }

  // Auth: Anonymous guest login
  // POST /api/v1/auth/anonymous
  const anonymousHandler = async (
    request: FastifyRequest,
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
    const { accessToken, refreshToken } = await issueTokens(user);

    await app.captureAddress(user.id, request.ip);

    return reply
      .status(200)
      .send(
        AuthTokenResponseSchema.parse({ accessToken, refreshToken, user })
      );
  };

  // Auth: Exchange a refresh token for a fresh access/refresh pair
  // POST /api/v1/auth/refresh
  const refreshHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const bodyParsed = RefreshTokenBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid refresh token body",
        request.url,
        bodyParsed.error.issues
      );
    }

    const unauthorized = () =>
      app.sendProblem(
        reply,
        401,
        "Unauthorized",
        "Invalid or expired refresh token",
        request.url
      );

    const presentedHash = hashRefreshToken(bodyParsed.data.refreshToken);
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.refreshTokenHash, presentedHash))
      .limit(1);

    if (!session) {
      // A spent token being presented proves it leaked, so revoke the session
      // rather than merely rejecting the request.
      const [reused] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.previousRefreshTokenHash, presentedHash))
        .limit(1);
      if (reused) {
        await db.delete(sessions).where(eq(sessions.id, reused.id));
      }
      return unauthorized();
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await db.delete(sessions).where(eq(sessions.id, session.id));
      return unauthorized();
    }

    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!userRow) {
      await db.delete(sessions).where(eq(sessions.id, session.id));
      return unauthorized();
    }

    const user = UserSchema.parse(userRow);
    const refreshToken = await rotateRefreshToken(session);
    const accessToken = await issueAccessToken(user);

    return reply
      .status(200)
      .send(
        AuthTokenResponseSchema.parse({ accessToken, refreshToken, user })
      );
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
      try {
        user = await resolveOAuthUser(db, provider, profile, oauthState.guestUserId);
      } catch {
        clearStateCookie();
        return sendOAuthErrorPage(
          reply,
          "Failed to resolve the user account",
          clientOrigin
        );
      }

      const { accessToken, refreshToken } = await issueTokens(user);

      clearStateCookie();
      const payload = OAuthCallbackResponseSchema.parse({
        accessToken,
        refreshToken,
        user,
      });
      return reply
        .type("text/html")
        .send(renderOAuthSuccessPage(payload, clientOrigin));
    };

    app.get(`/api/v1/auth/oauth/${provider}`, startHandler);
    app.get(`/api/v1/auth/oauth/${provider}/callback`, callbackHandler);
  }

  app.post("/api/v1/auth/anonymous", anonymousHandler);
  app.post("/api/v1/auth/refresh", refreshHandler);
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
