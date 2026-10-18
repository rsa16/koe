import {
  CommentAuthorFlair,
  CommentListQuerySchema,
  CommentListResponseSchema,
  CommentSchema,
  CreateCommentBodySchema,
  CreateCommentParamsSchema,
  EventBus,
  ThreadSchema,
  UserRole,
} from "@koe/core";
import {
  comments,
  Database,
  moderationActions,
  reactions,
  threads,
  users,
  votes,
} from "@koe/db";
import { renderMarkdown } from "@koe/renderer";
import { and, eq, gt, inArray, notInArray, or, sql } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { computeReplyPosition } from "../replies.js";
import { parseCommentIdParam } from "../comment-scoped.js";
import { authorFlairsFor, loadHeldFlairs } from "../author-flairs.js";
import {
  DEFAULT_DUPLICATE_COMMENT_WINDOW_MS,
  RateLimitConfig,
  routeRateLimit,
} from "../plugins/rate-limit.js";

export interface CommentsRoutesOptions {
  db: Database;
  rateLimits?: RateLimitConfig;
  events: EventBus;
  allowGuestComments: boolean;
}

export default async function commentsRoutes(
  app: FastifyInstance,
  options: CommentsRoutesOptions
) {
  const { db, events, allowGuestComments } = options;
  const duplicateCommentWindowMs =
    options.rateLimits?.duplicateCommentWindowMs ??
    DEFAULT_DUPLICATE_COMMENT_WINDOW_MS;

  // Comments: create
  // POST /api/v1/threads/:id/comments
  const createCommentHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    if (!allowGuestComments && request.user?.role === "guest") {
      return app.sendProblem(
        reply,
        403,
        "Forbidden",
        "Sign in is required to post comments",
        request.url
      );
    }

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

    const createdComment = CommentSchema.parse(created);
    // Include the thread so subscribers can attribute the comment without a
    // second lookup (the comment only carries an opaque `threadId`).
    events.emit("comment.created", {
      comment: createdComment,
      thread: ThreadSchema.parse(existingThreads[0]),
    });

    return reply.status(201).send(createdComment);
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

    // A soft-deleted comment is hidden unless it still anchors live replies, in
    // which case it is surfaced as a tombstone so its children stay reachable.
    const deletedWithReplies = sql`(
      ${comments.status} = 'deleted'
      AND EXISTS (
        SELECT 1 FROM ${comments} AS child
        WHERE child.parent_id = ${comments.id}
          AND child.status <> 'deleted'
      )
    )`;

    const statusFilter = request.user
      ? or(
          eq(comments.status, "published"),
          and(
            eq(comments.status, "pending"),
            eq(comments.authorId, request.user.id)
          ),
          deletedWithReplies
        )
      : or(eq(comments.status, "published"), deletedWithReplies);

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
    const rootRows = await db
      .select({
        comment: comments,
        authorName: users.name,
        authorAvatarUrl: users.avatarUrl,
        authorRole: users.role,
      })
      .from(comments)
      .leftJoin(users, eq(users.id, comments.authorId))
      .where(whereRoots)
      .orderBy(
        sql`${comments.pinnedAt} DESC NULLS LAST`,
        comments.createdAt,
        comments.id
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const total = await db.$count(comments, whereRoots);

    const descendantRows = await db
      .select({
        comment: comments,
        authorName: users.name,
        authorAvatarUrl: users.avatarUrl,
        authorRole: users.role,
      })
      .from(comments)
      .leftJoin(users, eq(users.id, comments.authorId))
      .where(
        and(
          eq(comments.threadId, threadId),
          gt(comments.depth, 0),
          visibleFilter
        )
      )
      .orderBy(
        sql`${comments.pinnedAt} DESC NULLS LAST`,
        comments.createdAt,
        comments.id
      );

    // Every Flair an author displays is resolved once per page: Staff Flairs
    // from the role plus the Supporter Flairs they hold, ordered server-side.
    const authorIds = [
      ...new Set(
        [...rootRows, ...descendantRows].map((row) => row.comment.authorId)
      ),
    ];
    const heldByAuthor = await loadHeldFlairs(db, authorIds);
    const withFlairs = (row: CommentAuthorRow): CommentRowWithAuthor =>
      attachAuthor(row, heldByAuthor);
    const roots = rootRows.map(withFlairs);
    const descendants = descendantRows.map(withFlairs);

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

  // Comments: pin / unpin (moderators and admins curate the thread)
  // POST /api/v1/comments/:id/pin
  // DELETE /api/v1/comments/:id/pin
  const setPinnedHandler = (pinned: boolean) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const commentId = parseCommentIdParam(app, request, reply);
      if (!commentId) {
        return;
      }

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

      const [row] = await db
        .update(comments)
        .set({ pinnedAt: pinned ? new Date() : null, updatedAt: new Date() })
        .where(eq(comments.id, commentId))
        .returning();

      return reply.status(200).send(CommentSchema.parse(row));
    };
  };

  // Comments: delete a comment (soft delete, keeps replies as tombstones)
  // Authors may delete their own comment; moderators and admins may delete any.
  // DELETE /api/v1/comments/:id
  const deleteCommentHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const commentId = parseCommentIdParam(app, request, reply);
    if (!commentId) {
      return;
    }

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

    const actor = request.user!;
    const isAuthor = found[0].authorId === actor.id;
    const isModeratorOrAdmin =
      actor.role === "moderator" || actor.role === "admin";

    if (!isAuthor && !isModeratorOrAdmin) {
      return app.sendProblem(
        reply,
        403,
        "Forbidden",
        "You can only delete your own comment",
        request.url
      );
    }

    const row = await db.transaction(async (tx: Database) => {
      const [updated] = await tx
        .update(comments)
        .set({ status: "deleted", updatedAt: new Date() })
        .where(eq(comments.id, commentId))
        .returning();

      if (!isAuthor) {
        await tx.insert(moderationActions).values({
          actorId: actor.id,
          action: "delete",
          targetType: "comment",
          targetId: commentId,
          metadata: { previousStatus: found[0].status },
        });
      }

      return updated;
    });

    const comment = CommentSchema.parse(row);
    events.emit("comment.deleted", { comment });
    return reply.status(200).send(comment);
  };

  app.post(
    "/api/v1/threads/:id/comments",
    {
      preHandler: [
        app.authenticate,
        app.requireActiveUser,
        app.requireNetworkNotBlocked,
      ],
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
  app.post(
    "/api/v1/comments/:id/pin",
    { preHandler: [app.requireRole(["moderator", "admin"]), app.requireActiveUser] },
    setPinnedHandler(true)
  );
  app.delete(
    "/api/v1/comments/:id/pin",
    { preHandler: [app.requireRole(["moderator", "admin"]), app.requireActiveUser] },
    setPinnedHandler(false)
  );
  app.delete(
    "/api/v1/comments/:id",
    {
      preHandler: [
        app.authenticate,
        app.requireActiveUser,
        app.requireNetworkNotBlocked,
      ],
    },
    deleteCommentHandler
  );
}

type CommentRow = typeof comments.$inferSelect;
interface CommentAuthorRow {
  comment: CommentRow;
  authorName: string | null;
  authorAvatarUrl: string | null;
  authorRole: UserRole | null;
}
interface CommentRowWithAuthor extends CommentRow {
  authorName: string | null;
  authorAvatarUrl: string | null;
  authorRole: UserRole | null;
  authorFlairs: CommentAuthorFlair[];
}
interface CommentTreeNode extends CommentRowWithAuthor {
  children: CommentTreeNode[];
  userVote: 1 | -1 | null;
  userReactions: string[];
}

function attachAuthor(
  row: CommentAuthorRow,
  heldByAuthor: Map<string, CommentAuthorFlair[]>
): CommentRowWithAuthor {
  const deleted = row.comment.status === "deleted";
  return {
    ...row.comment,
    // Never leak the body of a soft-deleted comment; surface a tombstone.
    bodyMd: deleted ? "" : row.comment.bodyMd,
    bodyHtml: deleted ? "" : row.comment.bodyHtml,
    authorName: row.authorName,
    authorAvatarUrl: row.authorAvatarUrl,
    authorRole: row.authorRole,
    authorFlairs: authorFlairsFor(
      row.authorRole,
      heldByAuthor.get(row.comment.authorId) ?? []
    ),
  };
}

interface UserState {
  userVotes?: Map<string, 1 | -1>;
  userReactions?: Map<string, string[]>;
}

function buildCommentTree(
  rows: CommentRowWithAuthor[],
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