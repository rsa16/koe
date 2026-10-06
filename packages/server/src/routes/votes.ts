import { CreateVoteBodySchema, VoteSchema, VoteValue } from "@koe/core";
import { comments, Database, votes } from "@koe/db";
import { and, eq, sql } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { commentExists, parseCommentIdParam } from "../comment-scoped.js";
import { RateLimitConfig, routeRateLimit } from "../plugins/rate-limit.js";
import { withUniqueViolationRetry } from "../unique.js";

export interface VotesRoutesOptions {
  db: Database;
  rateLimits?: RateLimitConfig;
}

type VoteResult =
  | { status: 201; vote: typeof votes.$inferSelect }
  | { status: 200; vote: typeof votes.$inferSelect }
  | { status: 204; vote: null };

interface VoteDeltas {
  upvotes: number;
  downvotes: number;
}

function deltasFor(previous: VoteValue | null, next: VoteValue | null): VoteDeltas {
  return {
    upvotes: (next === 1 ? 1 : 0) - (previous === 1 ? 1 : 0),
    downvotes: (next === -1 ? 1 : 0) - (previous === -1 ? 1 : 0),
  };
}

export default async function votesRoutes(
  app: FastifyInstance,
  options: VotesRoutesOptions
) {
  const { db } = options;

  async function applyVoteDelta(
    tx: Database,
    commentId: string,
    deltas: VoteDeltas
  ) {
    const changes: Record<string, unknown> = {};
    if (deltas.upvotes !== 0) {
      changes.upvotes = sql`${comments.upvotes} + ${deltas.upvotes}`;
    }
    if (deltas.downvotes !== 0) {
      changes.downvotes = sql`${comments.downvotes} + ${deltas.downvotes}`;
    }
    await tx.update(comments).set(changes).where(eq(comments.id, commentId));
  }

  // Votes: cast, switch, or toggle off
  // POST /api/v1/comments/:id/vote
  const voteHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const commentId = parseCommentIdParam(app, request, reply);
    if (!commentId) {
      return;
    }

    const bodyParsed = CreateVoteBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid vote value",
        request.url,
        bodyParsed.error.issues
      );
    }

    const userId = request.user!.id;

    if (!(await commentExists(db, commentId))) {
      return app.sendProblem(
        reply,
        404,
        "Not Found",
        "Comment does not exist",
        request.url
      );
    }

    const value: VoteValue = bodyParsed.data.value;

    // Concurrent duplicate votes can race the unique (comment_id, user_id)
    // index; retry once so the loser resolves to a toggle or switch instead
    // of surfacing a unique-violation as a 500.
    const result = await withUniqueViolationRetry(async () =>
      db.transaction(async (tx: Database) => {
        const existing = await tx
          .select()
          .from(votes)
          .where(and(eq(votes.commentId, commentId), eq(votes.userId, userId)))
          .limit(1);

        if (existing.length === 0) {
          const [vote] = await tx
            .insert(votes)
            .values({ commentId, userId, value })
            .returning();
          await applyVoteDelta(tx, commentId, deltasFor(null, value));
          return { status: 201, vote };
        }

        const current = existing[0];
        if (current.value === value) {
          await tx.delete(votes).where(eq(votes.id, current.id));
          await applyVoteDelta(
            tx,
            commentId,
            deltasFor(current.value as VoteValue, null)
          );
          return { status: 204, vote: null };
        }

        const [vote] = await tx
          .update(votes)
          .set({ value, updatedAt: new Date() })
          .where(eq(votes.id, current.id))
          .returning();
        await applyVoteDelta(
          tx,
          commentId,
          deltasFor(current.value as VoteValue, value)
        );
        return { status: 200, vote };
      })
    );

    if (result.status === 204) {
      return reply.status(204).send();
    }
    return reply.status(result.status).send(VoteSchema.parse(result.vote));
  };

  // Votes: remove the current user's vote (idempotent)
  // DELETE /api/v1/comments/:id/vote
  const unvoteHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const commentId = parseCommentIdParam(app, request, reply);
    if (!commentId) {
      return;
    }

    const userId = request.user!.id;

    if (!(await commentExists(db, commentId))) {
      return app.sendProblem(
        reply,
        404,
        "Not Found",
        "Comment does not exist",
        request.url
      );
    }

    await db.transaction(async (tx: Database) => {
      const existing = await tx
        .select()
        .from(votes)
        .where(and(eq(votes.commentId, commentId), eq(votes.userId, userId)))
        .limit(1);

      if (existing.length === 0) {
        return;
      }

      const current = existing[0];
      await tx.delete(votes).where(eq(votes.id, current.id));
      await applyVoteDelta(
        tx,
        commentId,
        deltasFor(current.value as VoteValue, null)
      );
    });

    return reply.status(204).send();
  };

  app.post(
    "/api/v1/comments/:id/vote",
    {
      preHandler: [app.authenticate, app.requireActiveUser],
      ...(options.rateLimits
        ? routeRateLimit(options.rateLimits.votes, options.rateLimits.windowMs)
        : {}),
    },
    voteHandler
  );
  app.delete(
    "/api/v1/comments/:id/vote",
    {
      preHandler: [app.authenticate, app.requireActiveUser],
      ...(options.rateLimits
        ? routeRateLimit(options.rateLimits.votes, options.rateLimits.windowMs)
        : {}),
    },
    unvoteHandler
  );
}