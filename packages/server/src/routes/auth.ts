import {
  DEFAULT_OAUTH_STATE_MAX_AGE_SECONDS,
  signAccessToken,
  signOAuthState,
  verifyOAuthState,
} from "@koe/auth";
import {
  AnonymousAuthResponseSchema,
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
  generateCodeVerifier,
  generateState,
  GOOGLE_OAUTH_SCOPES,
  GoogleOAuthProvider,
  GoogleUserInfo,
} from "../oauth.js";
import { resolveGoogleUser } from "../user-accounts.js";

const OAUTH_STATE_COOKIE = "koe_oauth_state";

export interface AuthRoutesOptions {
  db: Database;
  jwtSecret: string;
  clientOrigin: string;
  googleOAuth?: GoogleOAuthProvider;
}

export default async function authRoutes(
  app: FastifyInstance,
  options: AuthRoutesOptions
) {
  const { db, jwtSecret, googleOAuth, clientOrigin } = options;

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

  // Auth: Google OAuth start
  // GET /api/v1/auth/oauth/google
  const oauthGoogleHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    if (!googleOAuth) {
      return app.sendProblem(
        reply,
        503,
        "Service Unavailable",
        "Google OAuth is not configured",
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
    const authorizationUrl = googleOAuth.createAuthorizationURL(
      state,
      codeVerifier,
      GOOGLE_OAUTH_SCOPES
    );
    const stateToken = await signOAuthState(
      { state, codeVerifier, guestUserId },
      jwtSecret
    );

    reply.setCookie(OAUTH_STATE_COOKIE, stateToken, oauthStateCookieAttributes);
    return reply.redirect(authorizationUrl.toString());
  };

  // Auth: Google OAuth callback
  // GET /api/v1/auth/oauth/google/callback
  const oauthGoogleCallbackHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const clearStateCookie = () =>
      reply.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });

    if (!googleOAuth) {
      return sendOAuthErrorPage(
        reply,
        "Google OAuth is not configured",
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

    if (!oauthState || oauthState.state !== state) {
      clearStateCookie();
      return sendOAuthErrorPage(
        reply,
        "Invalid or expired OAuth state",
        clientOrigin
      );
    }

    let profile: GoogleUserInfo;
    try {
      profile = await googleOAuth.validateAuthorizationCode(
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
      user = await resolveGoogleUser(db, profile, oauthState.guestUserId);
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

  app.post("/api/v1/auth/anonymous", anonymousHandler);
  app.get("/api/v1/auth/me", { preHandler: app.authenticate }, meHandler);
  app.patch(
    "/api/v1/auth/me",
    { preHandler: app.authenticate },
    updateMeHandler
  );
  app.get("/api/v1/auth/oauth/google", oauthGoogleHandler);
  app.get("/api/v1/auth/oauth/google/callback", oauthGoogleCallbackHandler);
}