import {
  CommentListQuerySchema,
  CommentListResponseSchema,
  CommentSchema,
  CreateCommentBodySchema,
  CreateCommentParamsSchema,
} from "@koe/core";
import { comments, Database, reactions, threads, users, votes } from "@koe/db";
import { renderMarkdown } from "@koe/renderer";
import { and, eq, gt, inArray, notInArray, or, sql } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { computeReplyPosition } from "../replies.js";
import {
  DEFAULT_DUPLICATE_COMMENT_WINDOW_MS,
  RateLimitConfig,
  routeRateLimit,
} from "../plugins/rate-limit.js";

export interface CommentsRoutesOptions {
  db: Database;
  rateLimits?: RateLimitConfig;
}

export default async function commentsRoutes(
  app: FastifyInstance,
  options: CommentsRoutesOptions
) {
  const { db } = options;
  const duplicateCommentWindowMs =
    options.rateLimits?.duplicateCommentWindowMs ??
    DEFAULT_DUPLICATE_COMMENT_WINDOW_MS;

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

    if (duplicateCommentWindowMs > 0) {
      const windowStart = new Date(Date.now() - duplicateCommentWindowMs);
      const duplicates = await db
        .select({ id: comments.id })
        .from(comments)
        .where(
          and(
            eq(comments.threadId, threadId),
            eq(comments.authorId, request.user!.id),
            eq(comments.bodyMd, bodyParsed.data.bodyMd),
            gt(comments.createdAt, windowStart)
          )
        )
        .limit(1);

      if (duplicates.length > 0) {
        return app.sendProblem(
          reply,
          409,
          "Conflict",
          "Duplicate comment detected",
          request.url
        );
      }
    }

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

    const statusFilter = request.user
      ? or(
          eq(comments.status, "published"),
          and(
            eq(comments.status, "pending"),
            eq(comments.authorId, request.user.id)
          )
        )
      : eq(comments.status, "published");

    const bannedAuthorIds = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.status, "banned"));

    const visibleFilter = and(
      statusFilter,
      notInArray(comments.authorId, bannedAuthorIds)
    );

    const whereRoots = and(
      eq(comments.threadId, threadId),
      eq(comments.depth, 0),
      visibleFilter
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
      .where(
        and(eq(comments.threadId, threadId), gt(comments.depth, 0), visibleFilter)
      )
      .orderBy(comments.createdAt, comments.id);

    let userVotes: Map<string, 1 | -1> | undefined;
    let userReactions: Map<string, string[]> | undefined;
    if (request.user) {
      const pageIds = [...roots, ...descendants].map((row) => row.id);
      const voteRows: typeof votes.$inferSelect[] = await db
        .select()
        .from(votes)
        .where(
          and(
            eq(votes.userId, request.user.id),
            inArray(votes.commentId, pageIds)
          )
        );
      userVotes = new Map(
        voteRows.map((vote) => [vote.commentId, vote.value as 1 | -1])
      );

      const reactionRows: typeof reactions.$inferSelect[] = await db
        .select()
        .from(reactions)
        .where(
          and(
            eq(reactions.targetType, "comment"),
            eq(reactions.userId, request.user.id),
            inArray(reactions.targetId, pageIds)
          )
        );
      userReactions = new Map();
      for (const row of reactionRows) {
        const list = userReactions.get(row.targetId);
        if (list) {
          list.push(row.emoji);
        } else {
          userReactions.set(row.targetId, [row.emoji]);
        }
      }
    }

    const tree = buildCommentTree([...roots, ...descendants], {
      userVotes,
      userReactions,
    });

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
    {
      preHandler: [app.authenticate, app.requireActiveUser],
      ...(options.rateLimits
        ? routeRateLimit(options.rateLimits.comments, options.rateLimits.windowMs)
        : {}),
    },
    createCommentHandler
  );
  app.get(
    "/api/v1/threads/:id/comments",
    { preHandler: app.authenticateOptional },
    listCommentsHandler
  );
}

type CommentRow = typeof comments.$inferSelect;
interface CommentTreeNode extends CommentRow {
  children: CommentTreeNode[];
  userVote: 1 | -1 | null;
  userReactions: string[];
}

interface UserState {
  userVotes?: Map<string, 1 | -1>;
  userReactions?: Map<string, string[]>;
}

function buildCommentTree(
  rows: CommentRow[],
  userState?: UserState
): CommentTreeNode[] {
  const byParent = new Map<string | null, CommentTreeNode[]>();
  for (const row of rows) {
    const node: CommentTreeNode = {
      ...row,
      children: [],
      userVote: userState?.userVotes?.get(row.id) ?? null,
      userReactions: userState?.userReactions?.get(row.id) ?? [],
    };
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