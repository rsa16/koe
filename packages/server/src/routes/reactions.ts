import {
  CreateReactionBodySchema,
  DeleteReactionParamsSchema,
  EmojiSchema,
  ReactionSchema,
} from "@koe/core";
import { comments, Database, reactions } from "@koe/db";
import { eq, sql } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { commentExists, findReaction, parseCommentIdParam } from "../comment-scoped.js";
import { withUniqueViolationRetry } from "../unique.js";

export interface ReactionsRoutesOptions {
  db: Database;
  allowlist: string[];
}

type ReactionResult =
  | { status: 201; reaction: typeof reactions.$inferSelect }
  | { status: 204; reaction: null };

export default async function reactionsRoutes(
  app: FastifyInstance,
  options: ReactionsRoutesOptions
) {
  const { db, allowlist } = options;

  const allowedEmojiSchema = EmojiSchema.refine(
    (emoji) => allowlist.includes(emoji),
    { message: "Emoji is not in the configured allowlist" }
  );
  const createBodySchema = CreateReactionBodySchema.extend({
    emoji: allowedEmojiSchema,
  });
  const deleteParamsSchema = DeleteReactionParamsSchema.extend({
    emoji: allowedEmojiSchema,
  });

  async function applyReactionDelta(
    tx: Database,
    commentId: string,
    emoji: string,
    delta: number
  ) {
    const current = sql`COALESCE((${comments.reactionTotals}->>${emoji})::int, 0)`;
    const next = sql`${current} + ${delta}`;
    await tx
      .update(comments)
      .set({
        reactionTotals: sql`CASE
          WHEN ${next} <= 0 THEN COALESCE(${comments.reactionTotals}, '{}'::jsonb) - ${emoji}
          ELSE jsonb_set(COALESCE(${comments.reactionTotals}, '{}'::jsonb), ARRAY[${emoji}], to_jsonb(${next}), true)
        END`,
      })
      .where(eq(comments.id, commentId));
  }

  // Reactions: cast or toggle off
  // POST /api/v1/comments/:id/reactions
  const reactHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const commentId = parseCommentIdParam(app, request, reply);
    if (!commentId) {
      return;
    }

    const bodyParsed = createBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid reaction emoji",
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

    const emoji: string = bodyParsed.data.emoji;

    // Concurrent duplicate reactions can race the unique
    // (target_type, target_id, user_id, emoji) index; retry once so the
    // loser resolves to a toggle-off instead of surfacing a
    // unique-violation as a 500.
    const result = await withUniqueViolationRetry(async () =>
      db.transaction(async (tx: Database) => {
        const existing = await findReaction(tx, commentId, userId, emoji);

        if (existing === null) {
          const [reaction] = await tx
            .insert(reactions)
            .values({
              targetType: "comment",
              targetId: commentId,
              userId,
              emoji,
            })
            .returning();
          await applyReactionDelta(tx, commentId, emoji, 1);
          return { status: 201, reaction };
        }

        await tx.delete(reactions).where(eq(reactions.id, existing.id));
        await applyReactionDelta(tx, commentId, emoji, -1);
        return { status: 204, reaction: null };
      })
    );

    if (result.status === 204) {
      return reply.status(204).send();
    }
    return reply.status(201).send(ReactionSchema.parse(result.reaction));
  };

  // Reactions: remove the current user's reaction (idempotent)
  // DELETE /api/v1/comments/:id/reactions/:emoji
  const unreactHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const paramsParsed = deleteParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid reaction identifier parameters",
        request.url,
        paramsParsed.error.issues
      );
    }

    const commentId = paramsParsed.data.id;
    const emoji = paramsParsed.data.emoji;
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
      const existing = await findReaction(tx, commentId, userId, emoji);

      if (existing === null) {
        return;
      }

      await tx.delete(reactions).where(eq(reactions.id, existing.id));
      await applyReactionDelta(tx, commentId, emoji, -1);
    });

    return reply.status(204).send();
  };

  app.post(
    "/api/v1/comments/:id/reactions",
    { preHandler: app.authenticate },
    reactHandler
  );
  app.delete(
    "/api/v1/comments/:id/reactions/:emoji",
    { preHandler: app.authenticate },
    unreactHandler
  );
}