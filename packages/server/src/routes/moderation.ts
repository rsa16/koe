import {
  CommentModerationActionVerb,
  CommentSchema,
  CommentStatus,
  CreateModerationActionBodySchema,
  ModerationActionListResponseSchema,
  ModerationQueueResponseSchema,
  ThreadContext,
  UserSchema,
} from "@koe/core";
import {
  comments,
  Database,
  moderationActions,
  reports,
  threads,
  users,
} from "@koe/db";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface ModerationRoutesOptions {
  db: Database;
}

const COMMENT_ACTION_EFFECTS: Record<
  CommentModerationActionVerb,
  {
    nextStatus: CommentStatus;
    reportStatus: "dismissed" | "resolved";
    bypassesTransitionGuard: boolean;
  }
> = {
  approve: {
    nextStatus: "published",
    reportStatus: "dismissed",
    bypassesTransitionGuard: false,
  },
  reject: {
    nextStatus: "deleted",
    reportStatus: "resolved",
    bypassesTransitionGuard: false,
  },
  delete: {
    nextStatus: "deleted",
    reportStatus: "resolved",
    bypassesTransitionGuard: true,
  },
  spam: {
    nextStatus: "spam",
    reportStatus: "resolved",
    bypassesTransitionGuard: true,
  },
};

export function createModerationHandlers(app: FastifyInstance, db: Database) {
  // Moderation: queue
  // GET /api/v1/moderation/queue
  const queueHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const openReports = db
      .select({ commentId: reports.commentId })
      .from(reports)
      .where(eq(reports.status, "open"));

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
      .where(
        or(
          eq(comments.status, "pending"),
          and(
            eq(comments.status, "published"),
            inArray(comments.id, openReports)
          )
        )
      )
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

    const body = bodyParsed.data;

    if ("userId" in body) {
      const { userId, action } = body;

      if (action === "ban" && request.user!.role !== "admin") {
        return app.sendProblem(
          reply,
          403,
          "Forbidden",
          "Only admins can ban users",
          request.url
        );
      }

      const found = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (found.length === 0) {
        return app.sendProblem(
          reply,
          404,
          "Not Found",
          "User does not exist",
          request.url
        );
      }

      const status = action === "ban" ? "banned" : "suspended";

      const updated = await db.transaction(async (tx: Database) => {
        const [user] = await tx
          .update(users)
          .set({ status, updatedAt: new Date() })
          .where(eq(users.id, userId))
          .returning();

        await tx.insert(moderationActions).values({
          actorId: request.user!.id,
          action,
          targetType: "user",
          targetId: userId,
          metadata: { previousStatus: found[0].status },
        });

        return user;
      });

      return reply.status(200).send(UserSchema.parse(updated));
    }

    const { commentId, action } = body;

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

    const openReports = await db
      .select({ id: reports.id })
      .from(reports)
      .where(
        and(eq(reports.commentId, commentId), eq(reports.status, "open"))
      )
      .limit(1);
    const hasOpenReports = openReports.length > 0;

    const effect = COMMENT_ACTION_EFFECTS[action];

    if (
      !effect.bypassesTransitionGuard &&
      found[0].status !== "pending" &&
      !hasOpenReports
    ) {
      return app.sendProblem(
        reply,
        409,
        "Conflict",
        "Only pending or reported comments can be approved or rejected",
        request.url
      );
    }

    const status = effect.nextStatus;
    const reportStatus = effect.reportStatus;

    const updated = await db.transaction(async (tx: Database) => {
      const [comment] = await tx
        .update(comments)
        .set({ status })
        .where(eq(comments.id, commentId))
        .returning();

      await tx
        .update(reports)
        .set({ status: reportStatus, updatedAt: new Date() })
        .where(
          and(eq(reports.commentId, commentId), eq(reports.status, "open"))
        );

      await tx.insert(moderationActions).values({
        actorId: request.user!.id,
        action,
        targetType: "comment",
        targetId: commentId,
        metadata: { previousStatus: found[0].status },
      });

      return comment;
    });

    return reply.status(200).send(CommentSchema.parse(updated));
  };

  // Moderation: audit log
  // GET /api/v1/moderation/actions
  const auditHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const rows: Array<{
      record: typeof moderationActions.$inferSelect;
      actorName: string | null;
    }> = await db
      .select({
        record: moderationActions,
        actorName: users.name,
      })
      .from(moderationActions)
      .innerJoin(users, eq(moderationActions.actorId, users.id))
      .orderBy(desc(moderationActions.createdAt), desc(moderationActions.id));

    return reply.status(200).send(
      ModerationActionListResponseSchema.parse({
        actions: rows.map((row) => ({
          ...row.record,
          actorName: row.actorName,
        })),
      })
    );
  };

  return { queueHandler, actionHandler, auditHandler };
}

export default async function moderationRoutes(
  app: FastifyInstance,
  options: ModerationRoutesOptions
) {
  const { queueHandler, actionHandler, auditHandler } = createModerationHandlers(
    app,
    options.db
  );

  app.get(
    "/api/v1/moderation/queue",
    { preHandler: app.requireRole(["moderator", "admin"]) },
    queueHandler
  );
  app.get(
    "/api/v1/moderation/actions",
    { preHandler: app.requireRole(["admin"]) },
    auditHandler
  );
  app.post(
    "/api/v1/moderation/actions",
    { preHandler: app.requireRole(["moderator", "admin"]) },
    actionHandler
  );
}
