import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import fastifyStatic from "@fastify/static";
import { DEFAULT_EMOJI_ALLOWLIST, EmojiAllowlistSchema } from "@koe/core";
import { Database } from "@koe/db";
import Fastify, { FastifyInstance } from "fastify";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { GoogleOAuthProvider } from "./oauth.js";

import problemDetailsPlugin from "./plugins/problem-details.js";
import authenticatePlugin from "./plugins/authenticate.js";
import adminSessionPlugin from "./plugins/admin-session.js";

import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import threadsRoutes from "./routes/threads.js";
import commentsRoutes from "./routes/comments.js";
import votesRoutes from "./routes/votes.js";
import reactionsRoutes from "./routes/reactions.js";
import reportsRoutes from "./routes/reports.js";
import moderationRoutes from "./routes/moderation.js";
import usersRoutes from "./routes/users.js";
import adminRoutes from "./routes/admin.js";
import adminUsersRoutes from "./routes/admin-users.js";
import adminSettingsRoutes from "./routes/admin-settings.js";

export interface BuildAppOptions {
  db: Database;
  jwtSecret: string;
  logger?: boolean;
  googleOAuth?: GoogleOAuthProvider;
  clientOrigin?: string;
  reactionAllowlist?: string[];
  sessionSecret?: string;
  adminDistPath?: string;
}

export function registerAdminSpa(
  app: FastifyInstance,
  adminDistPath?: string
): void {
  if (!adminDistPath) {
    return;
  }

  const indexHtmlPath = path.join(adminDistPath, "index.html");
  if (!existsSync(indexHtmlPath)) {
    return;
  }

  const indexHtml = readFileSync(indexHtmlPath);

  app.register(async (adminScope) => {
    adminScope.register(fastifyStatic, {
      root: adminDistPath,
      prefix: "/admin/",
      decorateReply: false,
    });

    adminScope.setNotFoundHandler((request, reply) => {
      if (request.url === "/admin" || request.url.startsWith("/admin/")) {
        return reply.type("text/html; charset=utf-8").send(indexHtml);
      }
      return reply.callNotFound();
    });
  });

  app.get("/admin", (_request, reply) => reply.redirect("/admin/"));
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
  });

  const jwtSecret = options.jwtSecret;
  const sessionSecret = options.sessionSecret ?? jwtSecret;
  const googleOAuth = options.googleOAuth;
  const clientOrigin = options.clientOrigin ?? "*";
  const reactionAllowlist = EmojiAllowlistSchema.parse(
    options.reactionAllowlist ?? DEFAULT_EMOJI_ALLOWLIST
  );

  app.register(sensible);
  app.register(cookie);
  app.register(cors, {
    origin: true,
  });

  app.register(problemDetailsPlugin);
  app.register(authenticatePlugin, { jwtSecret, db: options.db });
  app.register(adminSessionPlugin, { db: options.db, sessionSecret });

  app.register(healthRoutes);
  app.register(authRoutes, {
    db: options.db,
    jwtSecret,
    clientOrigin,
    googleOAuth,
  });
  app.register(threadsRoutes, { db: options.db });
  app.register(commentsRoutes, { db: options.db });
  app.register(votesRoutes, { db: options.db });
  app.register(reactionsRoutes, { db: options.db, allowlist: reactionAllowlist });
  app.register(reportsRoutes, { db: options.db });
  app.register(moderationRoutes, { db: options.db });
  app.register(usersRoutes, { db: options.db });
  app.register(adminRoutes, { db: options.db, jwtSecret, sessionSecret });
  app.register(adminUsersRoutes, { db: options.db });
  app.register(adminSettingsRoutes, {
    reactionAllowlist,
    googleOAuthEnabled: Boolean(googleOAuth),
  });

  registerAdminSpa(app, options.adminDistPath);

  return app;
}