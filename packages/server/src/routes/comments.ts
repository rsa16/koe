import {
  CommentListQuerySchema,
  CommentListResponseSchema,
  CommentSchema,
  CreateCommentBodySchema,
  CreateCommentParamsSchema,
} from "@koe/core";
import { comments, Database, threads } from "@koe/db";
import { renderMarkdown } from "@koe/renderer";
import { and, eq, gt, sql } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { computeReplyPosition } from "../replies.js";

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

    const parentId = bodyParsed.data.parentId;
    let parent: typeof comments.$inferSelect | null = null;
    if (parentId) {
      const parents = await db
        .select()
        .from(comments)
        .where(and(eq(comments.id, parentId), eq(comments.threadId, threadId)))
        .limit(1);
      if (parents.length === 0) {
        return app.sendProblem(
          reply,
          404,
          "Not Found",
          "Parent comment does not exist",
          request.url
        );
      }
      parent = parents[0];
    }

    const position = computeReplyPosition(
      parent ? { id: parent.id, depth: parent.depth, path: parent.path } : null
    );

    const created = await db.transaction(async (tx: Database) => {
      const [comment] = await tx
        .insert(comments)
        .values({
          threadId,
          authorId: request.user!.id,
          parentId: position.parentId,
          bodyMd: bodyParsed.data.bodyMd,
          bodyHtml: renderMarkdown(bodyParsed.data.bodyMd),
          status,
          depth: position.depth,
          path: position.path,
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

  // Comments: list (nested tree, paginated top-level)
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

    const whereRoots = and(
      eq(comments.threadId, threadId),
      eq(comments.depth, 0)
    );
    const roots = await db
      .select()
      .from(comments)
      .where(whereRoots)
      .orderBy(comments.createdAt, comments.id)
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const total = await db.$count(comments, whereRoots);

    const descendants = await db
      .select()
      .from(comments)
      .where(and(eq(comments.threadId, threadId), gt(comments.depth, 0)))
      .orderBy(comments.createdAt, comments.id);

    const tree = buildCommentTree([...roots, ...descendants]);

    return reply
      .status(200)
      .send(
        CommentListResponseSchema.parse({
          comments: tree,
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

type CommentRow = typeof comments.$inferSelect;
interface CommentTreeNode extends CommentRow {
  children: CommentTreeNode[];
}

function buildCommentTree(rows: CommentRow[]): CommentTreeNode[] {
  const byParent = new Map<string | null, CommentTreeNode[]>();
  for (const row of rows) {
    const node: CommentTreeNode = { ...row, children: [] };
    const siblings = byParent.get(node.parentId);
    if (siblings) {
      siblings.push(node);
    } else {
      byParent.set(node.parentId, [node]);
    }
  }

  function attach(parentId: string | null): CommentTreeNode[] {
    const children = byParent.get(parentId) ?? [];
    for (const child of children) {
      child.children = attach(child.id);
    }
    return children;
  }

  return attach(null);
}