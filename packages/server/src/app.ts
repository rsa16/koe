import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { DEFAULT_EMOJI_ALLOWLIST, EmojiAllowlistSchema } from "@koe/core";
import { Database } from "@koe/db";
import Fastify, { FastifyInstance } from "fastify";
import { GoogleOAuthProvider } from "./oauth.js";

import problemDetailsPlugin from "./plugins/problem-details.js";
import authenticatePlugin from "./plugins/authenticate.js";

import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import threadsRoutes from "./routes/threads.js";
import commentsRoutes from "./routes/comments.js";
import votesRoutes from "./routes/votes.js";
import reactionsRoutes from "./routes/reactions.js";

export interface BuildAppOptions {
  db: Database;
  jwtSecret: string;
  logger?: boolean;
  googleOAuth?: GoogleOAuthProvider;
  clientOrigin?: string;
  reactionAllowlist?: string[];
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
  });

  const jwtSecret = options.jwtSecret;
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

  return app;
}