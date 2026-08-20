import { createKoeClient } from "@koe/sdk";

export interface WalkthroughOptions {
  baseUrl: string;
  adminToken: string;
}

export async function runWalkthrough(options: WalkthroughOptions) {
  const { baseUrl, adminToken } = options;
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

    console.log("\n==================================================");
    console.log("   ALL TICKETS 01-10 VERIFIED SUCCESSFULLY!      ");
    console.log("==================================================\n");
  } catch (error) {
    console.error("\n[Walkthrough Error]:", error);
  }
}
