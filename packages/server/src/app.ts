import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { GetThreadByRefParamsSchema, GetThreadByRefQuerySchema } from "@koe/core";
import { Database, threads } from "@koe/db";
import { eq } from "drizzle-orm";
import Fastify, { FastifyInstance } from "fastify";

export interface BuildAppOptions {
  db: Database;
  logger?: boolean;
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
  });

  app.register(sensible);
  app.register(cors, {
    origin: true,
  });

  // Helper to send RFC 9457 Problem Details
  const sendProblem = (
    reply: any,
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

  // Healthcheck endpoint
  app.get("/health", async (_request, reply) => {
    return reply.status(200).send({ status: "ok" });
  });

  // Register GET /api/v1/threads/by-ref/:ref
  const getThreadHandler = async (request: any, reply: any) => {
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
