import {
  CommentAuthorFlair,
  CommentAuthorFlairSchema,
  staffFlairsForRole,
  UserRole,
} from "@koe/core";
import { Database, flairs, userFlairs } from "@koe/db";
import { eq, inArray } from "drizzle-orm";

/**
 * Orders Flairs for display: Staff Flairs first, then by `rank` (the only
 * source of display order), with `slug` as a stable tie-breaker. The widget
 * renders the list as given, so ordering must be resolved here.
 */
export function orderAuthorFlairs(
  authorFlairs: CommentAuthorFlair[]
): CommentAuthorFlair[] {
  return [...authorFlairs].sort((a, b) => {
    if (a.staff !== b.staff) {
      return a.staff ? -1 : 1;
    }
    if (a.rank !== b.rank) {
      return a.rank - b.rank;
    }
    return a.slug.localeCompare(b.slug);
  });
}

/**
 * The held Supporter Flairs for each of `userIds`, keyed by User id. Until the
 * Flair Selection ticket lands this is every held Flair.
 */
export async function loadHeldFlairs(
  db: Database,
  userIds: string[]
): Promise<Map<string, CommentAuthorFlair[]>> {
  const byUser = new Map<string, CommentAuthorFlair[]>();
  if (userIds.length === 0) {
    return byUser;
  }

  const rows = await db
    .select({
      userId: userFlairs.userId,
      slug: flairs.slug,
      label: flairs.label,
      colour: flairs.colour,
      rank: flairs.rank,
    })
    .from(userFlairs)
    .innerJoin(flairs, eq(flairs.id, userFlairs.flairId))
    .where(inArray(userFlairs.userId, userIds));

  for (const row of rows) {
    const flair = CommentAuthorFlairSchema.parse({
      slug: row.slug,
      label: row.label,
      colour: row.colour,
      rank: row.rank,
      staff: false,
    });
    const held = byUser.get(row.userId);
    if (held) {
      held.push(flair);
    } else {
      byUser.set(row.userId, [flair]);
    }
  }

  return byUser;
}

/**
 * The full, ordered display set for one author: Staff Flairs derived from the
 * role, followed by the Supporter Flairs they hold.
 */
export function authorFlairsFor(
  role: UserRole | null,
  held: CommentAuthorFlair[]
): CommentAuthorFlair[] {
  return orderAuthorFlairs([...staffFlairsForRole(role), ...held]);
}
