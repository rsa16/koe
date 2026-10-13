import { Database, userNetworkAddresses } from "@koe/db";
import { and, desc, eq, inArray, lt, notInArray, sql } from "drizzle-orm";
import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

export const DEFAULT_MAX_ADDRESSES_PER_USER = 10;
export const DEFAULT_ANONYMOUS_PRUNE_AGE_DAYS = 30;
export const DEFAULT_ADDRESS_SWEEP_INTERVAL_MS = 60 * 60 * 1000;

export interface NetworkAddressesConfig {
  /** Whether capture is active. Off by default; when off nothing is stored. */
  enabled: boolean;
  /** Retention window in ms applied to captured addresses. */
  retentionMs: number;
}

export interface NetworkAddressesOptions extends NetworkAddressesConfig {
  db: Database;
}

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export interface RecordAddressInput {
  userId: string;
  ip: string;
  retentionMs: number;
  maxPerUser: number;
  now?: Date;
}

/**
 * Records that `userId` was seen acting from `ip`, refreshing last-seen when the
 * (User, address) pair already exists, then trims that User's history to the
 * retention window and the per-User cap — atomically, so a capture never leaves
 * the store transiently over the cap.
 */
export async function recordAddress(
  db: Database,
  input: RecordAddressInput
): Promise<void> {
  const { userId, ip, retentionMs, maxPerUser } = input;
  const now = input.now ?? new Date();

  await db.transaction(async (tx: Database) => {
    await tx
      .insert(userNetworkAddresses)
      .values({ userId, ip, firstSeenAt: now, lastSeenAt: now })
      .onConflictDoUpdate({
        target: [userNetworkAddresses.userId, userNetworkAddresses.ip],
        set: { lastSeenAt: now },
      });

    await pruneUserAddresses(tx, userId, { retentionMs, maxPerUser, now });
  });
}

/**
 * Drops a User's addresses older than the retention window and any beyond the
 * per-User cap, keeping the most-recently-seen ones.
 */
export async function pruneUserAddresses(
  db: Database,
  userId: string,
  options: { retentionMs: number; maxPerUser: number; now?: Date }
): Promise<void> {
  const now = options.now ?? new Date();

  if (options.retentionMs > 0) {
    const cutoff = new Date(now.getTime() - options.retentionMs);
    await db
      .delete(userNetworkAddresses)
      .where(
        and(
          eq(userNetworkAddresses.userId, userId),
          lt(userNetworkAddresses.lastSeenAt, cutoff)
        )
      );
  }

  const keep = await db
    .select({ id: userNetworkAddresses.id })
    .from(userNetworkAddresses)
    .where(eq(userNetworkAddresses.userId, userId))
    .orderBy(desc(userNetworkAddresses.lastSeenAt))
    .limit(options.maxPerUser);

  const keepIds = keep.map((row: { id: string }) => row.id);
  await db
    .delete(userNetworkAddresses)
    .where(
      and(
        eq(userNetworkAddresses.userId, userId),
        keepIds.length > 0
          ? notInArray(userNetworkAddresses.id, keepIds)
          : sql`true`
      )
    );
}

/** Global sweep: removes every captured address past the retention window. */
export async function pruneExpiredAddresses(
  db: Database,
  retentionMs: number,
  now: Date = new Date()
): Promise<void> {
  if (retentionMs <= 0) {
    return;
  }
  const cutoff = new Date(now.getTime() - retentionMs);
  await db
    .delete(userNetworkAddresses)
    .where(lt(userNetworkAddresses.lastSeenAt, cutoff));
}

/**
 * Moves a User's captured addresses onto another User (e.g. when a guest is
 * merged on login), discarding any address the target already has.
 */
export async function reassignAddresses(
  db: Database,
  fromUserId: string,
  toUserId: string
): Promise<void> {
  const targetAddresses = db
    .select({ ip: userNetworkAddresses.ip })
    .from(userNetworkAddresses)
    .where(eq(userNetworkAddresses.userId, toUserId));

  await db
    .delete(userNetworkAddresses)
    .where(
      and(
        eq(userNetworkAddresses.userId, fromUserId),
        inArray(userNetworkAddresses.ip, targetAddresses)
      )
    );
  await db
    .update(userNetworkAddresses)
    .set({ userId: toUserId })
    .where(eq(userNetworkAddresses.userId, fromUserId));
}

export default fp(async function networkAddressesPlugin(
  app: FastifyInstance,
  options: NetworkAddressesOptions
) {
  const { db, enabled } = options;

  async function capture(userId: string, ip: string): Promise<void> {
    if (!enabled) {
      return;
    }
    try {
      await recordAddress(db, {
        userId,
        ip,
        retentionMs: options.retentionMs,
        maxPerUser: DEFAULT_MAX_ADDRESSES_PER_USER,
      });
    } catch (error) {
      app.log.warn({ err: error, userId }, "failed to capture network address");
    }
  }

  app.decorate("captureAddress", capture);

  if (!enabled) {
    return;
  }

  app.addHook("onResponse", async (request, reply) => {
    const userId = request.user?.id;
    if (!userId || !WRITE_METHODS.has(request.method)) {
      return;
    }
    if (reply.statusCode < 200 || reply.statusCode >= 300) {
      return;
    }
    await capture(userId, request.ip);
  });
});

declare module "fastify" {
  interface FastifyInstance {
    captureAddress(userId: string, ip: string): Promise<void>;
  }
}
