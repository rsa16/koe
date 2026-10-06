import { AdminSettingsSchema, COMMENT_DEPTH_CAP } from "@koe/core";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface AdminSettingsRoutesOptions {
  reactionAllowlist: string[];
  googleOAuthEnabled: boolean;
}

export default async function adminSettingsRoutes(
  app: FastifyInstance,
  options: AdminSettingsRoutesOptions
) {
  const { reactionAllowlist, googleOAuthEnabled } = options;

  // Admin: read-only effective configuration
  // GET /api/v1/admin/settings
  const settingsHandler = async (
    _request: FastifyRequest,
    reply: FastifyReply
  ) => {
    return reply.status(200).send(
      AdminSettingsSchema.parse({
        commentDepthCap: COMMENT_DEPTH_CAP,
        reactionAllowlist,
        preModerationDefault: true,
        googleOAuthEnabled,
      })
    );
  };

  app.get(
    "/api/v1/admin/settings",
    { preHandler: app.requireAdminRole(["admin"]) },
    settingsHandler
  );
}
