import { AdminSettingsSchema, COMMENT_DEPTH_CAP } from "@koe/core";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface AdminSettingsRoutesOptions {
  reactionAllowlist: string[];
  preModerationDefault: boolean;
  googleOAuthEnabled: boolean;
  discordOAuthEnabled: boolean;
}

export default async function adminSettingsRoutes(
  app: FastifyInstance,
  options: AdminSettingsRoutesOptions
) {
  const { reactionAllowlist, preModerationDefault, googleOAuthEnabled, discordOAuthEnabled } =
    options;

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
        preModerationDefault,
        googleOAuthEnabled,
        discordOAuthEnabled,
      })
    );
  };

  app.get(
    "/api/v1/admin/settings",
    { preHandler: app.requireAdminRole(["admin"]) },
    settingsHandler
  );
}
