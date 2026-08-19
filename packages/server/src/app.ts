import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { signAccessToken, TokenPayload, verifyAccessToken } from "@koe/auth";
import {
  AnonymousAuthResponseSchema,
  GetThreadByRefParamsSchema,
  GetThreadByRefQuerySchema,
  User,
  UserSchema,
} from "@koe/core";
import { Database, identities, threads, users } from "@koe/db";
import { eq } from "drizzle-orm";
import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import crypto from "node:crypto";

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
  }
}

export interface BuildAppOptions {
  db: Database;
  jwtSecret: string;
  logger?: boolean;
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
  });

  const jwtSecret = options.jwtSecret;

  app.register(sensible);
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
