import {
  CommentSchema,
  CreateModerationActionBodySchema,
  ModerationQueueItemSchema,
  ModerationQueueResponseSchema,
  ThreadContext,
} from "@koe/core";
import { comments, Database, threads, users } from "@koe/db";
import { eq } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface ModerationRoutesOptions {
  db: Database;
}

export default async function moderationRoutes(
  app: FastifyInstance,
  options: ModerationRoutesOptions
) {
  const { db } = options;

  // Moderation: queue
  // GET /api/v1/moderation/queue
  const queueHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const rows: Array<{
      comment: typeof comments.$inferSelect;
      thread: ThreadContext;
      authorName: string | null;
    }> = await db
      .select({
        comment: comments,
        thread: {
          id: threads.id,
          externalRef: threads.externalRef,
          title: threads.title,
          url: threads.url,
        },
        authorName: users.name,
      })
      .from(comments)
      .innerJoin(threads, eq(comments.threadId, threads.id))
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.status, "pending"))
      .orderBy(comments.createdAt, comments.id);

    return reply.status(200).send(
      ModerationQueueResponseSchema.parse({
        comments: rows.map((row) => ({
          ...row.comment,
          thread: row.thread,
          authorName: row.authorName,
        })),
      })
    );
  };

  // Moderation: actions
  // POST /api/v1/moderation/actions
  const actionHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const bodyParsed = CreateModerationActionBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid moderation action body",
        request.url,
        bodyParsed.error.issues
      );
    }

    const { commentId, action } = bodyParsed.data;

    const found = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (found.length === 0) {
      return app.sendProblem(
        reply,
        404,
        "Not Found",
        "Comment does not exist",
        request.url
      );
    }

    if (action !== "delete" && found[0].status !== "pending") {
      return app.sendProblem(
        reply,
        409,
        "Conflict",
        "Only pending comments can be approved or rejected",
        request.url
      );
    }

    const status = action === "approve" ? "published" : "deleted";
    const [updated] = await db
      .update(comments)
      .set({ status })
      .where(eq(comments.id, commentId))
      .returning();

    return reply.status(200).send(CommentSchema.parse(updated));
  };

  app.get(
    "/api/v1/moderation/queue",
    { preHandler: app.authenticate },
    queueHandler
  );
  app.post(
    "/api/v1/moderation/actions",
    { preHandler: app.authenticate },
    actionHandler
  );
}