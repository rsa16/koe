import { describe, it, expect } from "vitest";
import { createMemDb, users, threads } from "./index.js";
import { eq } from "drizzle-orm";

describe("Database Schema Integration", () => {
  it("inserts and selects from threads table", async () => {
    const { db } = await createMemDb();

    const [inserted] = await db
      .insert(threads)
      .values({
        externalRef: "test-thread-ref",
        title: "Test Thread",
        url: "https://example.com/test",
      })
      .returning();

    expect(inserted.id).toBeDefined();
    expect(inserted.externalRef).toBe("test-thread-ref");
    expect(inserted.preModeration).toBe(true);

    const fetched = await db
      .select()
      .from(threads)
      .where(eq(threads.externalRef, "test-thread-ref"));

    expect(fetched.length).toBe(1);
    expect(fetched[0].title).toBe("Test Thread");
  });
});
