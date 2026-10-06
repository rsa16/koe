import { IdParamSchema } from "@koe/core";
import { Database, threads } from "@koe/db";
import { eq } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export async function threadExists(
  db: Database,
  threadId: string
): Promise<boolean> {
  const found = await db
    .select()
    .from(threads)
    .where(eq(threads.id, threadId))
    .limit(1);
  return found.length > 0;
}

export function parseThreadIdParam(
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
      "Invalid thread identifier parameter",
      request.url,
      parsed.error.issues
    );
    return undefined;
  }
  return parsed.data.id;
}
