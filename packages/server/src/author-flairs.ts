import {
  CommentAuthorFlair,
  CommentAuthorFlairSchema,
  Flair,
  FlairSchema,
  staffFlairsForRole,
  UserRole,
} from "@koe/core";
import { Database, flairs, userFlairs, users } from "@koe/db";
import { asc, eq, inArray } from "drizzle-orm";

/**
 * Orders Flairs for display: Staff Flairs first, then by `rank` (the only
 * source of display order), with `slug` as a stable tie-breaker. The widget
 * renders the list as given, so ordering must be resolved here.
 */
function compareAuthorFlairs(
  a: CommentAuthorFlair,
  b: CommentAuthorFlair
): number {
  if (a.staff !== b.staff) {
    return a.staff ? -1 : 1;
  }
  if (a.rank !== b.rank) {
    return a.rank - b.rank;
  }
  return a.slug.localeCompare(b.slug);
}

export function orderAuthorFlairs(
  authorFlairs: CommentAuthorFlair[]
): CommentAuthorFlair[] {
  return [...authorFlairs].sort(compareAuthorFlairs);
}

interface HeldFlair {
  id: string;
  flair: CommentAuthorFlair;
}

/**
 * The Supporter Flairs a User actually displays, computed server-side. A
 * non-empty Flair Selection is intersected with what is held (so a released
 * Flair disappears without the User touching their selection); otherwise every
 * held Supporter Flair displays, ranked, up to the three-Flair cap. Order is
 * always `rank`, never the order the User sent.
 */
export function effectiveDisplayedFlairs(
  held: HeldFlair[],
  selectedIds: string[]
): CommentAuthorFlair[] {
  const ordered = [...held].sort((a, b) =>
    compareAuthorFlairs(a.flair, b.flair)
  );

  if (selectedIds.length === 0) {
    return ordered.slice(0, 3).map((entry) => entry.flair);
  }

  const selected = new Set(selectedIds);
  return ordered
    .filter((entry) => selected.has(entry.id))
    .slice(0, 3)
    .map((entry) => entry.flair);
}

/** The ids of every Supporter Flair one User currently holds. */
export async function loadHeldFlairIds(
  db: Database,
  userId: string
): Promise<Set<string>> {
  const rows = await db
    .select({ flairId: userFlairs.flairId })
    .from(userFlairs)
    .where(eq(userFlairs.userId, userId));
  return new Set(rows.map((row: { flairId: string }) => row.flairId));
}

/**
 * The held Supporter Flair definitions for one User, ordered by rank. Used by
 * the profile endpoint so a picker can offer exactly what the User holds.
 */
export async function loadHeldFlairDefinitions(
  db: Database,
  userId: string
): Promise<Flair[]> {
  const rows = await db
    .select({
      id: flairs.id,
      slug: flairs.slug,
      label: flairs.label,
      colour: flairs.colour,
      rank: flairs.rank,
      createdAt: flairs.createdAt,
      updatedAt: flairs.updatedAt,
    })
    .from(userFlairs)
    .innerJoin(flairs, eq(flairs.id, userFlairs.flairId))
    .where(eq(userFlairs.userId, userId))
    .orderBy(asc(flairs.rank), asc(flairs.slug));

  return rows.map((row: Record<string, unknown>) => FlairSchema.parse(row));
}

/**
 * The effective displayed Supporter Flair set for each of `userIds`, keyed by
 * User id. Computed once per page so the widget never infers, sorts or
 * truncates anything.
 */
export async function loadDisplayedFlairs(
  db: Database,
  userIds: string[]
): Promise<Map<string, CommentAuthorFlair[]>> {
  const byUser = new Map<string, CommentAuthorFlair[]>();
  if (userIds.length === 0) {
    return byUser;
  }

  const [heldRows, selectionRows] = await Promise.all([
    db
      .select({
        userId: userFlairs.userId,
        id: flairs.id,
        slug: flairs.slug,
        label: flairs.label,
        colour: flairs.colour,
        rank: flairs.rank,
      })
      .from(userFlairs)
      .innerJoin(flairs, eq(flairs.id, userFlairs.flairId))
      .where(inArray(userFlairs.userId, userIds)),
    db
      .select({ id: users.id, displayedFlairIds: users.displayedFlairIds })
      .from(users)
      .where(inArray(users.id, userIds)),
  ]);

  const selectionByUser = new Map<string, string[]>(
    selectionRows.map((row: { id: string; displayedFlairIds: string[] }) => [
      row.id,
      row.displayedFlairIds,
    ])
  );

  const heldByUser = new Map<string, HeldFlair[]>();
  for (const row of heldRows) {
    const flair = CommentAuthorFlairSchema.parse({
      slug: row.slug,
      label: row.label,
      colour: row.colour,
      rank: row.rank,
      staff: false,
    });
    const held = heldByUser.get(row.userId);
    if (held) {
      held.push({ id: row.id, flair });
    } else {
      heldByUser.set(row.userId, [{ id: row.id, flair }]);
    }
  }

  for (const userId of userIds) {
    byUser.set(
      userId,
      effectiveDisplayedFlairs(
        heldByUser.get(userId) ?? [],
        selectionByUser.get(userId) ?? []
      )
    );
  }

  return byUser;
}

/**
 * The full, ordered display set for one author: Staff Flairs derived from the
 * role, followed by the Supporter Flairs they display.
 */
export function authorFlairsFor(
  role: UserRole | null,
  displayed: CommentAuthorFlair[]
): CommentAuthorFlair[] {
  return orderAuthorFlairs([...staffFlairsForRole(role), ...displayed]);
}
