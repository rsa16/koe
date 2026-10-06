import {
  CreateReactionBodySchema,
  DeleteReactionParamsSchema,
  EmojiSchema,
  ReactionSchema,
} from "@koe/core";
import { comments, Database, reactions, threads } from "@koe/db";
import { eq, sql } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  commentExists,
  findReaction,
  parseCommentIdParam,
} from "../comment-scoped.js";
import { parseThreadIdParam, threadExists } from "../thread-scoped.js";
import { withUniqueViolationRetry } from "../unique.js";

export interface ReactionsRoutesOptions {
  db: Database;
  allowlist: string[];
}

type TargetType = "comment" | "thread";

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

  const targetTable = (targetType: TargetType) =>
    targetType === "comment" ? comments : threads;

  async function applyReactionDelta(
    tx: Database,
    targetType: TargetType,
    targetId: string,
    emoji: string,
    delta: number
  ) {
    const table = targetTable(targetType);
    const current = sql`COALESCE((${table.reactionTotals}->>${emoji})::int, 0)`;
    const next = sql`${current} + ${delta}`;
    await tx
      .update(table)
      .set({
        reactionTotals: sql`CASE
          WHEN ${next} <= 0 THEN COALESCE(${table.reactionTotals}, '{}'::jsonb) - ${emoji}
          ELSE jsonb_set(COALESCE(${table.reactionTotals}, '{}'::jsonb), ARRAY[${emoji}], to_jsonb(${next}), true)
        END`,
      })
      .where(eq(table.id, targetId));
  }

  async function toggleReaction(
    tx: Database,
    targetType: TargetType,
    targetId: string,
    userId: string,
    emoji: string
  ): Promise<ReactionResult> {
    const existing = await findReaction(
      tx,
      targetType,
      targetId,
      userId,
      emoji
    );

    if (existing === null) {
      const [reaction] = await tx
        .insert(reactions)
        .values({ targetType, targetId, userId, emoji })
        .returning();
      await applyReactionDelta(tx, targetType, targetId, emoji, 1);
      return { status: 201, reaction };
    }

    await tx.delete(reactions).where(eq(reactions.id, existing.id));
    await applyReactionDelta(tx, targetType, targetId, emoji, -1);
    return { status: 204, reaction: null };
  }

  async function removeReaction(
    tx: Database,
    targetType: TargetType,
    targetId: string,
    userId: string,
    emoji: string
  ) {
    const existing = await findReaction(
      tx,
      targetType,
      targetId,
      userId,
      emoji
    );
    if (existing === null) {
      return;
    }
    await tx.delete(reactions).where(eq(reactions.id, existing.id));
    await applyReactionDelta(tx, targetType, targetId, emoji, -1);
  }

  interface RegisterOptions {
    targetType: TargetType;
    basePath: string;
    parseTargetId: (
      app: FastifyInstance,
      request: FastifyRequest,
      reply: FastifyReply
    ) => string | undefined;
    targetExists: (db: Database, targetId: string) => Promise<boolean>;
    missingDetail: string;
  }

  function registerReactionRoutes(register: RegisterOptions) {
    const {
      targetType,
      basePath,
      parseTargetId,
      targetExists,
      missingDetail,
    } = register;

    // Reactions: cast or toggle off
    // POST /api/v1/{comments,threads}/:id/reactions
    const reactHandler = async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const targetId = parseTargetId(app, request, reply);
      if (!targetId) {
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

      if (!(await targetExists(db, targetId))) {
        return app.sendProblem(reply, 404, "Not Found", missingDetail, request.url);
      }

      const userId = request.user!.id;
      const emoji: string = bodyParsed.data.emoji;

      // Concurrent duplicate reactions can race the unique
      // (target_type, target_id, user_id, emoji) index; retry once so the
      // loser resolves to a toggle-off instead of surfacing a
      // unique-violation as a 500.
      const result = await withUniqueViolationRetry(async () =>
        db.transaction(async (tx: Database) =>
          toggleReaction(tx, targetType, targetId, userId, emoji)
        )
      );

      if (result.status === 204) {
        return reply.status(204).send();
      }
      return reply.status(201).send(ReactionSchema.parse(result.reaction));
    };

    // Reactions: remove the current user's reaction (idempotent)
    // DELETE /api/v1/{comments,threads}/:id/reactions/:emoji
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

      const targetId = paramsParsed.data.id;
      const emoji = paramsParsed.data.emoji;
      const userId = request.user!.id;

      if (!(await targetExists(db, targetId))) {
        return app.sendProblem(reply, 404, "Not Found", missingDetail, request.url);
      }

      await db.transaction(async (tx: Database) => {
        await removeReaction(tx, targetType, targetId, userId, emoji);
      });

      return reply.status(204).send();
    };

    app.post(
      `${basePath}/:id/reactions`,
      { preHandler: [app.authenticate, app.requireActiveUser] },
      reactHandler
    );
    app.delete(
      `${basePath}/:id/reactions/:emoji`,
      { preHandler: [app.authenticate, app.requireActiveUser] },
      unreactHandler
    );
  }

  registerReactionRoutes({
    targetType: "comment",
    basePath: "/api/v1/comments",
    parseTargetId: parseCommentIdParam,
    targetExists: commentExists,
    missingDetail: "Comment does not exist",
  });

  registerReactionRoutes({
    targetType: "thread",
    basePath: "/api/v1/threads",
    parseTargetId: parseThreadIdParam,
    targetExists: threadExists,
    missingDetail: "Thread does not exist",
  });
}
