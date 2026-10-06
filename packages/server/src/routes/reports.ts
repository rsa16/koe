import { CreateReportBodySchema, ReportSchema } from "@koe/core";
import { Database, reports } from "@koe/db";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { commentExists, parseCommentIdParam } from "../comment-scoped.js";

export interface ReportsRoutesOptions {
  db: Database;
}

export default async function reportsRoutes(
  app: FastifyInstance,
  options: ReportsRoutesOptions
) {
  const { db } = options;

  // Reports: flag a comment for moderator review
  // POST /api/v1/comments/:id/reports
  const createReportHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const commentId = parseCommentIdParam(app, request, reply);
    if (!commentId) {
      return;
    }

    const bodyParsed = CreateReportBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid report body",
        request.url,
        bodyParsed.error.issues
      );
    }

    if (!(await commentExists(db, commentId))) {
      return app.sendProblem(
        reply,
        404,
        "Not Found",
        "Comment does not exist",
        request.url
      );
    }

    const [created] = await db
      .insert(reports)
      .values({
        commentId,
        reporterId: request.user!.id,
        reason: bodyParsed.data.reason,
      })
      .returning();

    return reply.status(201).send(ReportSchema.parse(created));
  };

  app.post(
    "/api/v1/comments/:id/reports",
    { preHandler: app.authenticate },
    createReportHandler
  );
}
