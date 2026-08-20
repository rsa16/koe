import { signAccessToken } from "@koe/auth";
import { comments, Database, identities, threads, users, votes, reactions } from "@koe/db";
import { eq } from "drizzle-orm";

export interface SeedResult {
  adminUser: typeof users.$inferSelect;
  adminToken: string;
  demoThread: typeof threads.$inferSelect;
}

export async function seedDemoData(db: Database, jwtSecret: string): Promise<SeedResult> {
  // 1. Create Admin User
  const [adminUser] = await db
    .insert(users)
    .values({
      name: "Demo Admin",
      email: "admin@koe.local",
      role: "admin",
      status: "active",
      metadata: { seed: true },
    })
    .returning();

  await db.insert(identities).values({
    userId: adminUser.id,
    provider: "anonymous",
    providerUserId: `admin-${adminUser.id}`,
    profileData: { seeded: true },
  });

  const adminToken = await signAccessToken(
    { userId: adminUser.id, role: adminUser.role },
    { secret: jwtSecret, expiresIn: "1h" }
  );

  // 2. Create Demo Thread
  let [demoThread] = await db
    .select()
    .from(threads)
    .where(eq(threads.externalRef, "demo-article"))
    .limit(1);

  if (!demoThread) {
    [demoThread] = await db
      .insert(threads)
      .values({
        externalRef: "demo-article",
        title: "Building a Headless Commenting System with Lit and Fastify",
        url: "http://localhost:3000/",
        status: "open",
        preModeration: true,
        commentCount: 2,
        metadata: { seed: true },
      })
      .returning();
  }

  // 3. Create Demo Author User
  const [demoAuthor] = await db
    .insert(users)
    .values({
      name: "Alice (Contributor)",
      role: "member",
      status: "active",
      metadata: { seed: true },
    })
    .returning();

  // 4. Seed initial published comments
  const [rootComment] = await db
    .insert(comments)
    .values({
      threadId: demoThread.id,
      authorId: demoAuthor.id,
      parentId: null,
      bodyMd: "Welcome to **Koe**! This is a pre-seeded root comment showing *markdown* rendering and reactions.",
      bodyHtml: "<p>Welcome to <strong>Koe</strong>! This is a pre-seeded root comment showing <em>markdown</em> rendering and reactions.</p>",
      status: "published",
      depth: 0,
      path: "",
      upvotes: 3,
      downvotes: 0,
      reactionTotals: { "👍": 2, "🎉": 1 },
      metadata: {},
    })
    .returning();

  await db.insert(comments).values({
    threadId: demoThread.id,
    authorId: adminUser.id,
    parentId: rootComment.id,
    bodyMd: "Thanks for checking out the demo! Nested replies and moderation queues work out of the box.",
    bodyHtml: "<p>Thanks for checking out the demo! Nested replies and moderation queues work out of the box.</p>",
    status: "published",
    depth: 1,
    path: `/${rootComment.id}`,
    upvotes: 1,
    downvotes: 0,
    reactionTotals: { "❤️": 1 },
    metadata: {},
  });

  return {
    adminUser,
    adminToken,
    demoThread,
  };
}
