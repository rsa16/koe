import {
  AdminNetworkBlockListResponseSchema,
  IdParamSchema,
  NetworkBlockSchema,
} from "@koe/core";
import { Database, moderationActions, networkBlocks, users } from "@koe/db";
import { desc, eq, gt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface AdminNetworkBlocksRoutesOptions {
  db: Database;
}

export function createAdminNetworkBlocksHandlers(
  app: FastifyInstance,
  options: AdminNetworkBlocksRoutesOptions
) {
  const { db } = options;

  const creator = alias(users, "creator");
  const banned = alias(users, "banned");

  // Every ban writes a `block` ModerationAction, and re-banning an address
  // refreshes its existing block row, so one block can carry several actions.
  // This picks the latest action per block so the list has one row per block,
  // naming the most recently banned User.
  const latestBan = db
    .selectDistinctOn([sql`${moderationActions.metadata}->>'blockId'`], {
      blockId: sql<string>`${moderationActions.metadata}->>'blockId'`.as(
        "block_id"
      ),
      userId: sql<string>`${moderationActions.targetId}`.as("user_id"),
    })
    .from(moderationActions)
    .where(eq(moderationActions.action, "block"))
    .orderBy(
      sql`${moderationActions.metadata}->>'blockId'`,
      desc(moderationActions.createdAt),
      desc(moderationActions.id)
    )
    .as("latest_ban");

  // Admin: active Network Blocks, with the admin who created each and the User
  // whose ban derived it (linked through the `block` ModerationAction).
  // GET /api/v1/admin/network-blocks
  const listBlocksHandler = async (
    _request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const rows: Array<{
      block: typeof networkBlocks.$inferSelect;
      createdByName: string | null;
      bannedUserId: string | null;
      bannedUserName: string | null;
    }> = await db
      .select({
        block: networkBlocks,
        createdByName: creator.name,
        bannedUserId: latestBan.userId,
        bannedUserName: banned.name,
      })
      .from(networkBlocks)
      .leftJoin(latestBan, sql`${latestBan.blockId} = ${networkBlocks.id}::text`)
      .leftJoin(creator, eq(creator.id, networkBlocks.createdBy))
      .leftJoin(banned, eq(banned.id, latestBan.userId))
      .where(gt(networkBlocks.expiresAt, new Date()))
      .orderBy(desc(networkBlocks.createdAt), desc(networkBlocks.id));

    return reply.status(200).send(
      AdminNetworkBlockListResponseSchema.parse({
        blocks: rows.map((row) => ({
          ...NetworkBlockSchema.parse(row.block),
          createdByName: row.createdByName,
          bannedUserId: row.bannedUserId,
          bannedUserName: row.bannedUserName,
        })),
      })
    );
  };

  // Admin: revoke a Network Block so its address may interact again.
  // DELETE /api/v1/admin/network-blocks/:id
  const revokeBlockHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const paramsParsed = IdParamSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid Network Block ID parameter",
        request.url,
        paramsParsed.error.issues
      );
    }

    const deleted: Array<{ id: string }> = await db
      .delete(networkBlocks)
      .where(eq(networkBlocks.id, paramsParsed.data.id))
      .returning({ id: networkBlocks.id });

    if (deleted.length === 0) {
      return app.sendProblem(
        reply,
        404,
        "Not Found",
        "Network Block does not exist",
        request.url
      );
    }

    return reply.status(204).send();
  };

  return { listBlocksHandler, revokeBlockHandler };
}

export default async function adminNetworkBlocksRoutes(
  app: FastifyInstance,
  options: AdminNetworkBlocksRoutesOptions
) {
  const { listBlocksHandler, revokeBlockHandler } =
    createAdminNetworkBlocksHandlers(app, options);

  app.get(
    "/api/v1/admin/network-blocks",
    { preHandler: app.requireAdminRole(["admin"]) },
    listBlocksHandler
  );
  app.delete(
    "/api/v1/admin/network-blocks/:id",
    {
      preHandler: [app.requireAdminRole(["admin"]), app.requireAdminCsrf],
    },
    revokeBlockHandler
  );
}
