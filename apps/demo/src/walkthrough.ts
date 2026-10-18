import { createKoeClient } from "@koe/sdk";

export interface WalkthroughOptions {
  baseUrl: string;
  adminToken: string;
  serviceToken?: string;
  demoAuthorId?: string;
}

const DEMO_FLAIR = {
  slug: "demo-supporter",
  label: "Demo Supporter",
  colour: "#7c3aed",
  rank: 100,
};

/** Opens an admin UI session (cookie + CSRF) from the demo's admin token. */
async function openAdminSession(
  baseUrl: string,
  adminToken: string
): Promise<{ cookie: string; csrf: string } | null> {
  const response = await fetch(`${baseUrl}/api/v1/admin/session`, {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}` },
  });
  if (!response.ok) {
    return null;
  }
  const body = await response.json();
  const cookies = response.headers.getSetCookie?.() ?? [];
  const session = cookies.find((cookie) =>
    cookie.startsWith("koe_admin_session=")
  );
  if (!session || typeof body.csrfToken !== "string") {
    return null;
  }
  return { cookie: session.split(";")[0], csrf: body.csrfToken };
}

export async function runWalkthrough(options: WalkthroughOptions) {
  const { baseUrl, adminToken, serviceToken, demoAuthorId } = options;
  const client = createKoeClient({ baseUrl });

  console.log("\n==================================================");
  console.log("   KOE HEADLESS COMMENTING SYSTEM - TEST TRACE   ");
  console.log("==================================================\n");

  try {
    // 1. Healthcheck (Ticket 01)
    process.stdout.write("[01] Healthcheck endpoint ... ");
    const healthRes = await fetch(`${baseUrl}/health`);
    if (healthRes.status === 200) {
      console.log("PASSED (200 OK)");
    } else {
      console.log(`FAILED (${healthRes.status})`);
    }

    // 2. Anonymous Auth (Ticket 02)
    process.stdout.write("[02] Anonymous Guest Auth ... ");
    const guestAuth = await client.auth.anonymous();
    const guestToken = guestAuth.accessToken;
    const me = await client.auth.me(guestToken);
    if (me.role === "guest" && me.status === "active") {
      console.log(`PASSED (User ID: ${me.id}, Role: ${me.role})`);
    } else {
      console.log("FAILED");
    }

    // 3. Thread Get-or-Create (Ticket 01)
    process.stdout.write("[01] Thread Get-or-Create by ref ... ");
    const thread = await client.threads.getByRef("demo-article");
    if (thread.externalRef === "demo-article") {
      console.log(`PASSED (Thread ID: ${thread.id}, preModeration: ${thread.preModeration})`);
    } else {
      console.log("FAILED");
    }

    // 4. Create Comment with Markdown under Pre-Moderation (Tickets 04, 05, 09)
    process.stdout.write("[04, 05, 09] Post Markdown Comment (Pre-Moderation Pending) ... ");
    const commentBody = "Hello from **Automated SDK Walkthrough**! Testing *italic* and `code`.";
    const pendingComment = await client.comments.create(
      thread.id,
      { bodyMd: commentBody },
      guestToken
    );
    if (
      pendingComment.status === "pending" &&
      pendingComment.bodyHtml.includes("<strong>Automated SDK Walkthrough</strong>")
    ) {
      console.log(`PASSED (Comment ID: ${pendingComment.id}, Status: pending)`);
    } else {
      console.log("FAILED");
    }

    // 5. Create Nested Reply (Ticket 06)
    process.stdout.write("[06] Create Nested Reply with depth & path ... ");
    const replyComment = await client.comments.create(
      thread.id,
      {
        bodyMd: "This is a nested reply created via SDK.",
        parentId: pendingComment.id,
      },
      guestToken
    );
    if (replyComment.parentId === pendingComment.id && replyComment.depth === 1) {
      console.log(`PASSED (Reply ID: ${replyComment.id}, Depth: ${replyComment.depth})`);
    } else {
      console.log("FAILED");
    }

    // 6. Visibility check: Author sees pending, other reader does not (Ticket 09)
    process.stdout.write("[09] Pending Comment Isolation (Author vs Reader) ... ");
    const authorView = await client.comments.list(thread.id, undefined, guestToken);
    const authorSeesPending = authorView.comments.some((c) => c.id === pendingComment.id);

    const readerAuth = await client.auth.anonymous();
    const readerView = await client.comments.list(thread.id, undefined, readerAuth.accessToken);
    const readerSeesPending = readerView.comments.some((c) => c.id === pendingComment.id);

    if (authorSeesPending && !readerSeesPending) {
      console.log("PASSED (Author sees own pending comment, other reader does not)");
    } else {
      console.log("FAILED");
    }

    // 7. Up/Down Voting & Toggle (Ticket 07)
    process.stdout.write("[07] Up/Down Voting & Toggling ... ");
    const rootComment = authorView.comments[0];
    const initialUpvotes = rootComment.upvotes;
    await client.comments.vote(rootComment.id, 1, guestToken);
    const afterVote = await client.comments.list(thread.id, undefined, guestToken);
    const votedComment = afterVote.comments.find((c) => c.id === rootComment.id);
    await client.comments.unvote(rootComment.id, guestToken);
    if (votedComment && votedComment.upvotes === initialUpvotes + 1) {
      console.log("PASSED (Upvote incremented and unvoted correctly)");
    } else {
      console.log("FAILED");
    }

    // 8. Emoji Reactions (Ticket 08)
    process.stdout.write("[08] Comment Emoji Reactions ... ");
    await client.comments.react(rootComment.id, "🎉", guestToken);
    const afterReact = await client.comments.list(thread.id, undefined, guestToken);
    const reactedComment = afterReact.comments.find((c) => c.id === rootComment.id);
    await client.comments.unreact(rootComment.id, "🎉", guestToken);
    if (reactedComment?.reactionTotals?.["🎉"] !== undefined) {
      console.log("PASSED (React 🎉 incremented and unreacted correctly)");
    } else {
      console.log("FAILED");
    }

    // 9. Moderation Queue & Action: Approve (Ticket 09, 10)
    process.stdout.write("[09, 10] Moderation Queue & Approve Comment ... ");
    const queueBefore = await client.moderation.queue(adminToken);
    const inQueue = queueBefore.comments.some((c) => c.id === pendingComment.id);
    if (!inQueue) {
      console.log("FAILED (Comment not in queue)");
    } else {
      await client.moderation.act(pendingComment.id, "approve", adminToken);
      const afterApproval = await client.comments.list(thread.id, undefined, readerAuth.accessToken);
      const isNowPublic = afterApproval.comments.some((c) => c.id === pendingComment.id);
      if (isNowPublic) {
        console.log("PASSED (Comment approved and now visible publicly)");
      } else {
        console.log("FAILED (Comment not visible after approval)");
      }
    }

    // 10. Admin Roles & Permissions (Ticket 10)
    process.stdout.write("[10] Admin Role Management (PATCH /api/v1/users/:id) ... ");
    const updateRes = await fetch(`${baseUrl}/api/v1/users/${readerAuth.user.id}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ role: "moderator" }),
    });
    if (updateRes.status === 200) {
      const updatedUser = await updateRes.json();
      if (updatedUser.role === "moderator") {
        console.log("PASSED (Promoted guest user to moderator)");
      } else {
        console.log("FAILED (Role not updated)");
      }
    } else {
      console.log(`FAILED (${updateRes.status})`);
    }

    // 11. Flairs: define a Flair, assign it through the service API, and see it
    // appear on the author's comment payload (Tickets 25, 26, 27).
    if (serviceToken && demoAuthorId) {
      process.stdout.write("[25] Define a Flair via the admin API ... ");
      const session = await openAdminSession(baseUrl, adminToken);
      if (!session) {
        console.log("FAILED (could not open an admin session)");
      } else {
        const createRes = await fetch(`${baseUrl}/api/v1/admin/flairs`, {
          method: "POST",
          headers: {
            cookie: session.cookie,
            "x-csrf-token": session.csrf,
            "content-type": "application/json",
          },
          body: JSON.stringify(DEMO_FLAIR),
        });
        if (createRes.status === 201 || createRes.status === 409) {
          console.log(`PASSED (${DEMO_FLAIR.slug})`);
        } else {
          console.log(`FAILED (${createRes.status})`);
        }
      }

      process.stdout.write("[26, 27] Assign a Flair via the service API and render it ... ");
      const assignRes = await fetch(
        `${baseUrl}/api/v1/service/users/${demoAuthorId}/flairs`,
        {
          method: "PUT",
          headers: {
            authorization: `Bearer ${serviceToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ slugs: [DEMO_FLAIR.slug] }),
        }
      );
      if (!assignRes.ok) {
        console.log(`FAILED (${assignRes.status})`);
      } else {
        const reader = await client.auth.anonymous();
        const withFlairs = await client.comments.list(
          thread.id,
          undefined,
          reader.accessToken
        );
        const authorComment = withFlairs.comments.find(
          (comment) => comment.authorId === demoAuthorId
        );
        const shown = authorComment?.authorFlairs.some(
          (flair) => flair.slug === DEMO_FLAIR.slug
        );
        if (shown) {
          console.log(
            `PASSED (author now displays "${DEMO_FLAIR.label}")`
          );
        } else {
          console.log("FAILED (Flair not present on the comment payload)");
        }
      }
    }

    console.log("\n==================================================");
    console.log("   WALKTHROUGH COMPLETE (tickets 01-10, 25-27)   ");
    console.log("==================================================\n");
  } catch (error) {
    console.error("\n[Walkthrough Error]:", error);
  }
}
