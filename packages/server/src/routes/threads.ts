import { GetThreadByRefParamsSchema, GetThreadByRefQuerySchema } from "@koe/core";
import { Database, threads } from "@koe/db";
import { eq } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface ThreadsRoutesOptions {
  db: Database;
}

export default async function threadsRoutes(
  app: FastifyInstance,
  options: ThreadsRoutesOptions
) {
  const { db } = options;

  // Threads: GET by externalRef
  // GET /api/v1/threads/by-ref/:ref
  const getThreadHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const paramsParsed = GetThreadByRefParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return app.sendProblem(
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
    const { title, url } = queryParsed.success
      ? queryParsed.data
      : { title: undefined, url: undefined };

    // Query existing thread
    const existing = await db
      .select()
      .from(threads)
      .where(eq(threads.externalRef, ref))
      .limit(1);

    if (existing.length > 0) {
      return reply.status(200).send(existing[0]);
    }

    // Create new thread
    const inserted = await db
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
}