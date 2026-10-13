import { NetworkBlock, NetworkBlockSchema, NetworkBlockSource } from "@koe/core";
import {
  Database,
  moderationActions,
  networkBlocks,
  userNetworkAddresses,
} from "@koe/db";
import { and, eq, gt } from "drizzle-orm";

export const DEFAULT_NETWORK_BLOCK_TTL_MS = 24 * 60 * 60 * 1000;
export const AUTO_NETWORK_BLOCK_REASON = "Auto-derived from user ban";

export interface CreateNetworkBlocksForBanOptions {
  /** The banned User whose captured addresses are blocked. */
  userId: string;
  /** The admin whose ban created the blocks. */
  actorId: string;
  /** Block lifetime; defaults to 24 hours. */
  ttlMs?: number;
}

/**
 * Blocks every address a User was seen acting from. Re-blocking an address
 * already under block refreshes that row (extending its expiry) rather than
 * inserting a duplicate. Each block is audited as a `block` ModerationAction
 * attributed to the banning admin.
 */
export async function createNetworkBlocksForBan(
  db: Database,
  options: CreateNetworkBlocksForBanOptions
): Promise<NetworkBlock[]> {
  const now = new Date();
  const source: NetworkBlockSource = "auto";
  const expiresAt = new Date(
    now.getTime() + (options.ttlMs ?? DEFAULT_NETWORK_BLOCK_TTL_MS)
  );
  const blockFields = {
    reason: AUTO_NETWORK_BLOCK_REASON,
    source,
    createdBy: options.actorId,
    expiresAt,
  };

  const rows: Array<{ ip: string }> = await db
    .select({ ip: userNetworkAddresses.ip })
    .from(userNetworkAddresses)
    .where(eq(userNetworkAddresses.userId, options.userId));

  const blocks: NetworkBlock[] = [];
  for (const { ip } of rows) {
    const [block] = await db
      .insert(networkBlocks)
      .values({ ip, createdAt: now, ...blockFields })
      .onConflictDoUpdate({
        target: networkBlocks.ip,
        set: blockFields,
      })
      .returning();

    await db.insert(moderationActions).values({
      actorId: options.actorId,
      action: "block",
      targetType: "user",
      targetId: options.userId,
      metadata: { ip, blockId: block.id },
    });

    blocks.push(NetworkBlockSchema.parse(block));
  }

  return blocks;
}

/** True when `ip` is currently under an unexpired Network Block. */
export async function isAddressBlocked(
  db: Database,
  ip: string
): Promise<boolean> {
  const rows = await db
    .select({ id: networkBlocks.id })
    .from(networkBlocks)
    .where(and(eq(networkBlocks.ip, ip), gt(networkBlocks.expiresAt, new Date())))
    .limit(1);
  return rows.length > 0;
}
