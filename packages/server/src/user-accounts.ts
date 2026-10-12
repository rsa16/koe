import { IdentityProvider, User, UserSchema } from "@koe/core";
import { comments, Database, identities, users } from "@koe/db";
import { and, eq } from "drizzle-orm";
import { OAuthProfile } from "./oauth.js";

async function findUserById(db: Database, id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

async function findAnonymousGuest(db: Database, id: string) {
  const user = await findUserById(db, id);
  return user?.role === "guest" ? user : undefined;
}

export async function mergeGuestIntoUser(
  db: Database,
  guestUserId: string,
  targetUserId: string
): Promise<void> {
  if (guestUserId === targetUserId) {
    return;
  }
  await db.transaction(async (tx: Database) => {
    await tx
      .update(comments)
      .set({ authorId: targetUserId })
      .where(eq(comments.authorId, guestUserId));
    await tx.delete(users).where(eq(users.id, guestUserId));
  });
}

/**
 * Resolves an OAuth profile to a User, creating or reusing the Identity for
 * `provider`. When a guest session is present, its Identity is claimed (or the
 * guest is merged into the existing account) so comments survive the login.
 */
export async function resolveOAuthUser(
  db: Database,
  provider: IdentityProvider,
  profile: OAuthProfile,
  guestUserId?: string
): Promise<User> {
  const guest = guestUserId ? await findAnonymousGuest(db, guestUserId) : undefined;

  const existingIdentity = await db
    .select()
    .from(identities)
    .where(
      and(
        eq(identities.provider, provider),
        eq(identities.providerUserId, profile.sub)
      )
    )
    .limit(1);

  if (existingIdentity.length > 0) {
    const existingUser = await findUserById(db, existingIdentity[0].userId);
    if (!existingUser) {
      throw new Error(`Identity references missing user ${existingIdentity[0].userId}`);
    }
    if (guest) {
      await mergeGuestIntoUser(db, guest.id, existingUser.id);
    }
    return UserSchema.parse(existingUser);
  }

  const profileData = {
    name: profile.name,
    email: profile.email,
    picture: profile.picture,
  };

  if (guest) {
    await db.insert(identities).values({
      userId: guest.id,
      provider,
      providerUserId: profile.sub,
      profileData,
    });
    const [updated] = await db
      .update(users)
      .set({
        role: "member",
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.picture,
        updatedAt: new Date(),
      })
      .where(eq(users.id, guest.id))
      .returning();
    return UserSchema.parse(updated);
  }

  const [newUser] = await db
    .insert(users)
    .values({
      role: "member",
      status: "active",
      name: profile.name,
      email: profile.email,
      avatarUrl: profile.picture,
      metadata: {},
    })
    .returning();

  await db.insert(identities).values({
    userId: newUser.id,
    provider,
    providerUserId: profile.sub,
    profileData,
  });

  return UserSchema.parse(newUser);
}
