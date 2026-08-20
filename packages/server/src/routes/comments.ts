import {
  CommentListQuerySchema,
  CommentListResponseSchema,
  CommentSchema,
  CreateCommentBodySchema,
  CreateCommentParamsSchema,
} from "@koe/core";
import { comments, Database, threads } from "@koe/db";
import { eq, sql } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface CommentsRoutesOptions {
  db: Database;
}

export default async function commentsRoutes(
  app: FastifyInstance,
  options: CommentsRoutesOptions
) {
  const { db } = options;

  // Comments: create
  // POST /api/v1/threads/:id/comments
  const createCommentHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const paramsParsed = CreateCommentParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid thread identifier parameter",
        request.url,
        paramsParsed.error.issues
      );
    }

    const bodyParsed = CreateCommentBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid comment body",
        request.url,
        bodyParsed.error.issues
      );
    }

    const threadId = paramsParsed.data.id;
    const existingThreads = await db
      .select()
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (existingThreads.length === 0) {
      return app.sendProblem(
        reply,
        404,
        "Not Found",
        "Thread does not exist",
        request.url
      );
    }

    const status = existingThreads[0].preModeration ? "pending" : "published";
    const created = await db.transaction(async (tx: Database) => {
      const [comment] = await tx
        .insert(comments)
        .values({
          threadId,
          authorId: request.user!.id,
          bodyMd: bodyParsed.data.bodyMd,
          bodyHtml: "",
          status,
          depth: 0,
          path: "",
          upvotes: 0,
          downvotes: 0,
          metadata: {},
        })
        .returning();

      await tx
        .update(threads)
        .set({ commentCount: sql`${threads.commentCount} + 1` })
        .where(eq(threads.id, threadId));

      return comment;
    });

    return reply
      .status(201)
      .send(CommentSchema.parse(created));
  };

  // Comments: list (flat, paginated)
  // GET /api/v1/threads/:id/comments
  const listCommentsHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const paramsParsed = CreateCommentParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid thread identifier parameter",
        request.url,
        paramsParsed.error.issues
      );
    }

    const queryParsed = CommentListQuerySchema.safeParse(request.query);
    if (!queryParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid pagination parameters",
        request.url,
        queryParsed.error.issues
      );
    }

    const threadId = paramsParsed.data.id;
    const { page, pageSize } = queryParsed.data;

    const existingThreads = await db
      .select()
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (existingThreads.length === 0) {
      return app.sendProblem(
        reply,
        404,
        "Not Found",
        "Thread does not exist",
        request.url
      );
    }

    const where = eq(comments.threadId, threadId);
    const rows = await db
      .select()
      .from(comments)
      .where(where)
      .orderBy(comments.createdAt, comments.id)
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const total = await db.$count(comments, where);

    return reply
      .status(200)
      .send(
        CommentListResponseSchema.parse({
          comments: rows,
          total,
          page,
          pageSize,
        })
      );
  };

  app.post(
    "/api/v1/threads/:id/comments",
    { preHandler: app.authenticate },
    createCommentHandler
  );
  app.get("/api/v1/threads/:id/comments", listCommentsHandler);
}