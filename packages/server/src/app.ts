import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import fastifyStatic from "@fastify/static";
import {
  DEFAULT_EMOJI_ALLOWLIST,
  EmojiAllowlistSchema,
  WebhookSubscription,
  WebhookSubscriptionsSchema,
} from "@koe/core";
import { Database } from "@koe/db";
import Fastify, { FastifyInstance } from "fastify";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { DiscordOAuthProvider, GoogleOAuthProvider } from "./oauth.js";
import {
  createEventBus,
  createWebhookDispatcher,
  FetchLike,
} from "./events/index.js";

import problemDetailsPlugin from "./plugins/problem-details.js";
import authenticatePlugin from "./plugins/authenticate.js";
import adminSessionPlugin from "./plugins/admin-session.js";
import rateLimitPlugin, { RateLimitConfig } from "./plugins/rate-limit.js";
import { TrustProxyConfig } from "./trust-proxy.js";

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
  discordOAuth?: DiscordOAuthProvider;
  clientOrigin?: string;
  reactionAllowlist?: string[];
  preModerationDefault?: boolean;
  sessionSecret?: string;
  trustProxy?: TrustProxyConfig;
  adminDistPath?: string;
  adminBase?: string;
  rateLimits?: RateLimitConfig;
  webhookSubscriptions?: WebhookSubscription[];
  webhookTimeoutMs?: number;
  fetchImpl?: FetchLike;
  refreshTokenMaxAgeSeconds?: number;
}

const DEFAULT_ADMIN_BASE = "/admin/";

/** Normalises a configured base into a leading/trailing-slashed path. */
function normalizeAdminBase(base: string): string {
  const segment = base.trim().replace(/^\/+|\/+$/g, "");
  return segment ? `/${segment}/` : "/";
}

export function registerAdminSpa(
  app: FastifyInstance,
  adminDistPath?: string,
  adminBase: string = DEFAULT_ADMIN_BASE
): void {
  if (!adminDistPath) {
    return;
  }

  const indexHtmlPath = path.join(adminDistPath, "index.html");
  if (!existsSync(indexHtmlPath)) {
    return;
  }

  const base = normalizeAdminBase(adminBase);
  const baseWithoutSlash = base.replace(/\/$/, "");
  const indexHtml = readFileSync(indexHtmlPath);

  app.register(async (adminScope) => {
    adminScope.register(fastifyStatic, {
      root: adminDistPath,
      prefix: base,
      decorateReply: false,
    });

    adminScope.setNotFoundHandler((request, reply) => {
      if (request.url === baseWithoutSlash || request.url.startsWith(base)) {
        return reply.type("text/html; charset=utf-8").send(indexHtml);
      }
      return reply.callNotFound();
    });
  });

  if (baseWithoutSlash) {
    app.get(baseWithoutSlash, (_request, reply) => reply.redirect(base));
  }
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
    trustProxy: options.trustProxy ?? false,
  });

  const jwtSecret = options.jwtSecret;
  const sessionSecret = options.sessionSecret ?? jwtSecret;
  const googleOAuth = options.googleOAuth;
  const discordOAuth = options.discordOAuth;
  const clientOrigin = options.clientOrigin ?? "*";
  const reactionAllowlist = EmojiAllowlistSchema.parse(
    options.reactionAllowlist ?? DEFAULT_EMOJI_ALLOWLIST
  );
  const preModerationDefault = options.preModerationDefault ?? false;

  const events = createEventBus({
    onError: (error, event) =>
      app.log.error(
        { err: error, event: event.type },
        "event listener failed"
      ),
  });
  const webhookSubscriptions = WebhookSubscriptionsSchema.parse(
    options.webhookSubscriptions ?? []
  );
  const webhooks = createWebhookDispatcher(events, webhookSubscriptions, {
    fetchImpl: options.fetchImpl,
    timeoutMs: options.webhookTimeoutMs,
    onError: (error, subscription, event) =>
      app.log.warn(
        { err: error, url: subscription.url, event: event.type },
        "webhook delivery failed"
      ),
  });
  app.decorate("events", events);
  app.decorate("webhooks", webhooks);
  app.addHook("onClose", async () => {
    webhooks.stop();
  });

  app.register(sensible);
  app.register(cookie);
  app.register(cors, {
    origin: true,
  });

  app.register(problemDetailsPlugin);
  app.register(authenticatePlugin, { jwtSecret, db: options.db });
  app.register(adminSessionPlugin, { db: options.db, sessionSecret });
  if (options.rateLimits) {
    app.register(rateLimitPlugin, { jwtSecret });
  }

  app.register(healthRoutes);
  app.register(authRoutes, {
    db: options.db,
    jwtSecret,
    clientOrigin,
    googleOAuth,
    discordOAuth,
    refreshTokenMaxAgeSeconds: options.refreshTokenMaxAgeSeconds,
  });
  app.register(threadsRoutes, {
    db: options.db,
    preModerationDefault,
  });
  app.register(commentsRoutes, {
    db: options.db,
    rateLimits: options.rateLimits,
    events,
  });
  app.register(votesRoutes, {
    db: options.db,
    rateLimits: options.rateLimits,
    events,
  });
  app.register(reactionsRoutes, {
    db: options.db,
    allowlist: reactionAllowlist,
    rateLimits: options.rateLimits,
    events,
  });
  app.register(reportsRoutes, { db: options.db, events });
  app.register(moderationRoutes, { db: options.db, events });
  app.register(usersRoutes, { db: options.db });
  app.register(adminRoutes, { db: options.db, jwtSecret, sessionSecret, events });
  app.register(adminUsersRoutes, { db: options.db, events });
  app.register(adminSettingsRoutes, {
    reactionAllowlist,
    preModerationDefault,
    googleOAuthEnabled: Boolean(googleOAuth),
    discordOAuthEnabled: Boolean(discordOAuth),
  });

  registerAdminSpa(app, options.adminDistPath, options.adminBase);

  return app;
}