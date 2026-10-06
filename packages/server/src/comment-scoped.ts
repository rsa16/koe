import { IdParamSchema } from "@koe/core";
import { comments, Database, reactions } from "@koe/db";
import { and, eq } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export async function commentExists(
  db: Database,
  commentId: string
): Promise<boolean> {
  const found = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);
  return found.length > 0;
}

export async function findReaction(
  db: Database,
  targetType: "comment" | "thread",
  targetId: string,
  userId: string,
  emoji: string
): Promise<typeof reactions.$inferSelect | null> {
  const existing = await db
    .select()
    .from(reactions)
    .where(
      and(
        eq(reactions.targetType, targetType),
        eq(reactions.targetId, targetId),
        eq(reactions.userId, userId),
        eq(reactions.emoji, emoji)
      )
    )
    .limit(1);
  return existing[0] ?? null;
}

export function parseCommentIdParam(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): string | undefined {
  const parsed = IdParamSchema.safeParse(request.params);
  if (!parsed.success) {
    app.sendProblem(
      reply,
      400,
      "Bad Request",
      "Invalid comment identifier parameter",
      request.url,
      parsed.error.issues
    );
    return undefined;
  }
  return parsed.data.id;
}