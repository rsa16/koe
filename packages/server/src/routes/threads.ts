import {
  GetThreadByRefParamsSchema,
  GetThreadByRefQuerySchema,
  ThreadResponseSchema,
} from "@koe/core";
import { Database, reactions, threads } from "@koe/db";
import { and, eq } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface ThreadsRoutesOptions {
  db: Database;
  preModerationDefault: boolean;
}

export default async function threadsRoutes(
  app: FastifyInstance,
  options: ThreadsRoutesOptions
) {
  const { db, preModerationDefault } = options;

  async function userReactionsFor(
    threadId: string,
    userId: string
  ): Promise<string[]> {
    const rows: typeof reactions.$inferSelect[] = await db
      .select()
      .from(reactions)
      .where(
        and(
          eq(reactions.targetType, "thread"),
          eq(reactions.targetId, threadId),
          eq(reactions.userId, userId)
        )
      );
    return rows.map((row) => row.emoji);
  }

  // Threads: GET by externalRef (creates on first sight)
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
      const userReactions = request.user
        ? await userReactionsFor(existing[0].id, request.user.id)
        : [];
      return reply
        .status(200)
        .send(ThreadResponseSchema.parse({ ...existing[0], userReactions }));
    }

    // Create new thread
    const inserted = await db
      .insert(threads)
      .values({
        externalRef: ref,
        title: title || null,
        url: url || null,
        status: "open",
        preModeration: preModerationDefault,
        commentCount: 0,
        reactionTotals: {},
        metadata: {},
      })
      .returning();

    return reply
      .status(200)
      .send(ThreadResponseSchema.parse({ ...inserted[0], userReactions: [] }));
  };

  app.get(
    "/api/v1/threads/by-ref/:ref",
    { preHandler: app.authenticateOptional },
    getThreadHandler
  );
}
