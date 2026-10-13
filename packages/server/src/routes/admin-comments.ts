import {
  AdminBulkCommentActionBodySchema,
  AdminBulkCommentActionResponseSchema,
  AdminCommentListQuerySchema,
  AdminCommentListResponseSchema,
  AdminCommentThreadListQuerySchema,
  AdminCommentThreadListResponseSchema,
  CommentModerationActionVerb,
  CommentSchema,
  EventBus,
} from "@koe/core";
import {
  comments,
  Database,
  moderationActions,
  threads,
  users,
} from "@koe/db";
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  COMMENT_ACTION_EFFECTS,
  COMMENT_ACTION_EVENTS,
} from "./moderation.js";

export interface AdminCommentsRoutesOptions {
  db: Database;
  events: EventBus;
}

function isSql(condition: SQL | undefined): condition is SQL {
  return condition !== undefined;
}

export function createAdminCommentsHandlers(
  app: FastifyInstance,
  options: AdminCommentsRoutesOptions
) {
  const { db, events } = options;

  // Admin: filterable, paginated list of every comment
  // GET /api/v1/admin/comments
  const listCommentsHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const queryParsed = AdminCommentListQuerySchema.safeParse(request.query);
    if (!queryParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid comment list query",
        request.url,
        queryParsed.error.issues
      );
    }

    const { page, pageSize, status, threadId, authorId, search } =
      queryParsed.data;

    const conditions: Array<SQL | undefined> = [];
    if (status) {
      conditions.push(eq(comments.status, status));
    }
    if (threadId) {
      conditions.push(eq(comments.threadId, threadId));
    }
    if (authorId) {
      conditions.push(eq(comments.authorId, authorId));
    }
    if (search) {
      conditions.push(ilike(comments.bodyMd, `%${search}%`));
    }
    const filtered = conditions.filter(isSql);
    const where = filtered.length > 0 ? and(...filtered) : undefined;

    const rows: Array<{
      comment: typeof comments.$inferSelect;
      thread: {
        id: string;
        externalRef: string;
        title: string | null;
        url: string | null;
      };
      authorName: string | null;
      authorEmail: string | null;
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
        authorEmail: users.email,
      })
      .from(comments)
      .innerJoin(threads, eq(comments.threadId, threads.id))
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(where)
      .orderBy(desc(comments.createdAt), desc(comments.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .where(where);

    return reply.status(200).send(
      AdminCommentListResponseSchema.parse({
        comments: rows.map((row) => ({
          ...row.comment,
          thread: row.thread,
          authorName: row.authorName,
          authorEmail: row.authorEmail,
        })),
        total: countRow?.count ?? 0,
        page,
        pageSize,
      })
    );
  };

  // Admin: threads that hold comments, for the page filter
  // GET /api/v1/admin/comments/threads
  const listThreadsHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const queryParsed = AdminCommentThreadListQuerySchema.safeParse(
      request.query
    );
    if (!queryParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid thread list query",
        request.url,
        queryParsed.error.issues
      );
    }

    const { search } = queryParsed.data;
    const where = search
      ? or(
          ilike(threads.externalRef, `%${search}%`),
          ilike(threads.title, `%${search}%`)
        )
      : undefined;

    const rows: Array<{
      id: string;
      externalRef: string;
      title: string | null;
      url: string | null;
      commentCount: number;
    }> = await db
      .select({
        id: threads.id,
        externalRef: threads.externalRef,
        title: threads.title,
        url: threads.url,
        commentCount: sql<number>`count(${comments.id})::int`,
      })
      .from(comments)
      .innerJoin(threads, eq(comments.threadId, threads.id))
      .where(where)
      .groupBy(threads.id, threads.externalRef, threads.title, threads.url)
      .orderBy(desc(sql`count(${comments.id})`), threads.externalRef)
      .limit(100);

    return reply
      .status(200)
      .send(AdminCommentThreadListResponseSchema.parse({ threads: rows }));
  };

  // Admin: bulk comment action (moderate or pin)
  // POST /api/v1/admin/comments/actions
  const bulkActionHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const bodyParsed = AdminBulkCommentActionBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid bulk comment action body",
        request.url,
        bodyParsed.error.issues
      );
    }

    const { commentIds, action } = bodyParsed.data;

    if (action === "pin" || action === "unpin") {
      const updated = await db
        .update(comments)
        .set({
          pinnedAt: action === "pin" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(inArray(comments.id, commentIds))
        .returning({ id: comments.id });

      return reply
        .status(200)
        .send(AdminBulkCommentActionResponseSchema.parse({ updated: updated.length }));
    }

    const verb = action as CommentModerationActionVerb;
    const effect = COMMENT_ACTION_EFFECTS[verb];

    const targets: Array<{ id: string; status: string }> = await db
      .select({ id: comments.id, status: comments.status })
      .from(comments)
      .where(inArray(comments.id, commentIds));

    if (targets.length === 0) {
      return reply
        .status(200)
        .send(AdminBulkCommentActionResponseSchema.parse({ updated: 0 }));
    }

    const previousStatus = new Map(
      targets.map((target) => [target.id, target.status])
    );
    const ids = targets.map((target) => target.id);

    const updatedRows: Array<typeof comments.$inferSelect> = await db.transaction(
      async (tx: Database) => {
        const rows = await tx
          .update(comments)
          .set({ status: effect.nextStatus, updatedAt: new Date() })
          .where(inArray(comments.id, ids))
          .returning();

        await tx.insert(moderationActions).values(
          rows.map((row: typeof comments.$inferSelect) => ({
            actorId: request.user!.id,
            action: verb,
            targetType: "comment" as const,
            targetId: row.id,
            metadata: { previousStatus: previousStatus.get(row.id) ?? null },
          }))
        );

        return rows;
      }
    );

    for (const row of updatedRows) {
      events.emit(COMMENT_ACTION_EVENTS[verb], {
        comment: CommentSchema.parse(row),
      });
    }

    return reply
      .status(200)
      .send(
        AdminBulkCommentActionResponseSchema.parse({
          updated: updatedRows.length,
        })
      );
  };

  return { listCommentsHandler, listThreadsHandler, bulkActionHandler };
}

export default async function adminCommentsRoutes(
  app: FastifyInstance,
  options: AdminCommentsRoutesOptions
) {
  const { listCommentsHandler, listThreadsHandler, bulkActionHandler } =
    createAdminCommentsHandlers(app, options);

  app.get(
    "/api/v1/admin/comments",
    { preHandler: app.requireAdminRole(["admin"]) },
    listCommentsHandler
  );
  app.get(
    "/api/v1/admin/comments/threads",
    { preHandler: app.requireAdminRole(["admin"]) },
    listThreadsHandler
  );
  app.post(
    "/api/v1/admin/comments/actions",
    { preHandler: [app.requireAdminRole(["admin"]), app.requireAdminCsrf] },
    bulkActionHandler
  );
}
