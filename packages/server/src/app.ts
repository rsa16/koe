import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import {
  signAccessToken,
  signOAuthState,
  verifyAccessToken,
  verifyOAuthState,
  DEFAULT_OAUTH_STATE_MAX_AGE_SECONDS,
  TokenPayload,
} from "@koe/auth";
import {
  AnonymousAuthResponseSchema,
  GetThreadByRefParamsSchema,
  GetThreadByRefQuerySchema,
  OAuthCallbackQuerySchema,
  OAuthCallbackResponse,
  OAuthCallbackResponseSchema,
  OAuthStartQuerySchema,
  User,
  UserSchema,
} from "@koe/core";
import {
  Database,
  identities,
  threads,
  users,
} from "@koe/db";
import { eq } from "drizzle-orm";
import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import crypto from "node:crypto";
import {
  generateCodeVerifier,
  generateState,
  GoogleOAuthProvider,
  GoogleUserInfo,
  GOOGLE_OAUTH_SCOPES,
} from "./oauth.js";
import { resolveGoogleUser } from "./user-accounts.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
  }
}

export interface BuildAppOptions {
  db: Database;
  jwtSecret: string;
  logger?: boolean;
  googleOAuth?: GoogleOAuthProvider;
  clientOrigin?: string;
}

const OAUTH_STATE_COOKIE = "koe_oauth_state";

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
  });

  const jwtSecret = options.jwtSecret;
  const googleOAuth = options.googleOAuth;
  const clientOrigin = options.clientOrigin ?? "*";

  app.register(sensible);
  app.register(cookie);
  app.register(cors, {
    origin: true,
  });

  // Helper to send RFC 9457 Problem Details
  const sendProblem = (
    reply: FastifyReply,
    status: number,
    title: string,
    detail?: string,
    instance?: string,
    invalidParams?: unknown
  ) => {
    return reply.status(status).type("application/problem+json").send({
      type: "about:blank",
      title,
      status,
      detail,
      instance,
      ...(invalidParams ? { "invalid-params": invalidParams } : {}),
    });
  };

  // RFC 9457 Problem Details Error Handler
  app.setErrorHandler((error: any, request, reply) => {
    const statusCode = error.statusCode || 500;
    return sendProblem(
      reply,
      statusCode,
      error.name || "Internal Server Error",
      error.message,
      request.url
    );
  });

  // Bearer-token authentication hook for the public API
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;

    if (!token) {
      return sendProblem(
        reply,
        401,
        "Unauthorized",
        "Missing authentication token",
        request.url
      );
    }

    let payload: TokenPayload;
    try {
      payload = await verifyAccessToken(token, { secret: jwtSecret });
    } catch {
      return sendProblem(
        reply,
        401,
        "Unauthorized",
        "Invalid or expired authentication token",
        request.url
      );
    }

    const foundUsers = await options.db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (foundUsers.length === 0) {
      return sendProblem(
        reply,
        401,
        "Unauthorized",
        "User does not exist",
        request.url
      );
    }

    request.user = UserSchema.parse(foundUsers[0]);
  };

  const renderOAuthResultPage = (payload: unknown): string => {
    const escapeJsonForHtml = (value: unknown) =>
      JSON.stringify(value)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>koe auth</title></head>
<body>
<script id="koe-oauth-result" type="application/json">${escapeJsonForHtml(payload)}</script>
<script>
  (function () {
    var result = document.getElementById("koe-oauth-result");
    var payload = JSON.parse(result.textContent);
    var origin = ${escapeJsonForHtml(clientOrigin)};
    var target = window.opener || window.parent;
    if (target) {
      target.postMessage(payload, origin);
    }
    window.close();
  })();
</script>
</body>
</html>`;
  };

  const renderOAuthSuccessPage = (payload: OAuthCallbackResponse) => {
    return renderOAuthResultPage({ type: "koe:oauth:success", ...payload });
  };

  const renderOAuthErrorPage = (message: string, status: number) => {
    return renderOAuthResultPage({
      type: "koe:oauth:error",
      error: { status, message },
    });
  };

  const sendOAuthErrorPage = (
    reply: FastifyReply,
    message: string,
    status = 400
  ) => {
    return reply.status(status).type("text/html").send(renderOAuthErrorPage(message, status));
  };

  const oauthStateCookieAttributes = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: DEFAULT_OAUTH_STATE_MAX_AGE_SECONDS,
  };

  // Healthcheck endpoint
  app.get("/health", async (_request, reply) => {
    return reply.status(200).send({ status: "ok" });
  });

  // Auth: Anonymous guest login
  const anonymousHandler = async (_request: FastifyRequest, reply: FastifyReply) => {
    const guestUuid = crypto.randomUUID();
    const [userRow] = await options.db
      .insert(users)
      .values({
        role: "guest",
        status: "active",
        metadata: {},
      })
      .returning();

    await options.db.insert(identities).values({
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

    return reply.status(200).send(
      AnonymousAuthResponseSchema.parse({ accessToken, user })
    );
  };

  app.post("/api/v1/auth/anonymous", anonymousHandler);

  // Auth: Current user profile
  const meHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send(UserSchema.parse(request.user));
  };

  app.get("/api/v1/auth/me", { preHandler: authenticate }, meHandler);

  // Auth: Google OAuth start
  const oauthGoogleHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!googleOAuth) {
      return sendProblem(
        reply,
        503,
        "Service Unavailable",
        "Google OAuth is not configured",
        request.url
      );
    }

    const queryParsed = OAuthStartQuerySchema.safeParse(request.query);
    if (!queryParsed.success) {
      return sendProblem(
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
    const stateToken = await signOAuthState({ state, codeVerifier, guestUserId }, jwtSecret);

    reply.setCookie(OAUTH_STATE_COOKIE, stateToken, oauthStateCookieAttributes);
    return reply.redirect(authorizationUrl.toString());
  };

  app.get("/api/v1/auth/oauth/google", oauthGoogleHandler);

  // Auth: Google OAuth callback
  const oauthGoogleCallbackHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const clearStateCookie = () => reply.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });

    if (!googleOAuth) {
      return sendOAuthErrorPage(reply, "Google OAuth is not configured", 503);
    }

    const queryParsed = OAuthCallbackQuerySchema.safeParse(request.query);
    if (!queryParsed.success) {
      return sendOAuthErrorPage(reply, "Invalid OAuth callback parameters");
    }
    const { code, state } = queryParsed.data;

    const stateToken = request.cookies[OAUTH_STATE_COOKIE];
    const oauthState = stateToken ? await verifyOAuthState(stateToken, jwtSecret) : null;

    if (!oauthState || oauthState.state !== state) {
      clearStateCookie();
      return sendOAuthErrorPage(reply, "Invalid or expired OAuth state");
    }

    let profile: GoogleUserInfo;
    try {
      profile = await googleOAuth.validateAuthorizationCode(code, oauthState.codeVerifier);
    } catch {
      clearStateCookie();
      return sendOAuthErrorPage(reply, "Failed to exchange the authorization code");
    }

    let user: User;
    let accessToken: string;
    try {
      user = await resolveGoogleUser(options.db, profile, oauthState.guestUserId);
      accessToken = await signAccessToken(
        { userId: user.id, role: user.role },
        { secret: jwtSecret, expiresIn: "15m" }
      );
    } catch {
      clearStateCookie();
      return sendOAuthErrorPage(reply, "Failed to resolve the user account");
    }

    clearStateCookie();
    const payload = OAuthCallbackResponseSchema.parse({ accessToken, user });
    return reply.type("text/html").send(renderOAuthSuccessPage(payload));
  };

  app.get("/api/v1/auth/oauth/google/callback", oauthGoogleCallbackHandler);

  // Threads: GET by externalRef
  const getThreadHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const paramsParsed = GetThreadByRefParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid thread reference parameter",
        request.url,
        paramsParsed.error.issues
      );
    }

    const queryParsed = GetThreadByRefQuerySchema.safeParse(request.query);
    const { ref } = paramsParsed.data;
    const { title, url } = queryParsed.success ? queryParsed.data : { title: undefined, url: undefined };

    // Query existing thread
    const existing = await options.db
      .select()
      .from(threads)
      .where(eq(threads.externalRef, ref))
      .limit(1);

    if (existing.length > 0) {
      return reply.status(200).send(existing[0]);
    }

    // Create new thread
    const inserted = await options.db
      .insert(threads)
      .values({
        externalRef: ref,
        title: title || null,
        url: url || null,
        status: "open",
        preModeration: true,
        commentCount: 0,
        metadata: {},
      })
      .returning();

    return reply.status(200).send(inserted[0]);
  };

  app.get("/api/v1/threads/by-ref/:ref", getThreadHandler);

  return app;
}