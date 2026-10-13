import { buildApp } from "./app.js";
import { createDbClient } from "@koe/db";
import { WebhookSubscriptionsSchema } from "@koe/core";
import { createDiscordOAuthProvider, createGoogleOAuthProvider } from "./oauth.js";
import {
  DEFAULT_DUPLICATE_COMMENT_WINDOW_MS,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
} from "./plugins/rate-limit.js";
import { DEFAULT_WEBHOOK_TIMEOUT_MS } from "./events/index.js";
import { parseTrustProxy } from "./trust-proxy.js";
import {
  DEFAULT_ADDRESS_SWEEP_INTERVAL_MS,
  DEFAULT_ANONYMOUS_PRUNE_AGE_DAYS,
  pruneExpiredAddresses,
} from "./plugins/network-addresses.js";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const databaseUrl = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/koe";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET must be set in the environment");
}

const reactionAllowlistEnv = process.env.REACTION_ALLOWLIST;
const reactionAllowlist = reactionAllowlistEnv
  ? reactionAllowlistEnv
      .split(",")
      .map((emoji) => emoji.trim())
      .filter(Boolean)
  : undefined;

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRedirectURI = process.env.GOOGLE_REDIRECT_URI;
const googleOAuth =
  googleClientId && googleClientSecret && googleRedirectURI
    ? createGoogleOAuthProvider(googleClientId, googleClientSecret, googleRedirectURI)
    : undefined;

const discordClientId = process.env.DISCORD_CLIENT_ID;
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET;
const discordRedirectURI = process.env.DISCORD_REDIRECT_URI;
const discordOAuth =
  discordClientId && discordClientSecret && discordRedirectURI
    ? createDiscordOAuthProvider(discordClientId, discordClientSecret, discordRedirectURI)
    : undefined;

const db = createDbClient(databaseUrl);

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

const rateLimits = {
  windowMs: envInt("RATE_LIMIT_WINDOW_MS", DEFAULT_RATE_LIMIT_WINDOW_MS),
  comments: envInt("RATE_LIMIT_COMMENTS", 10),
  votes: envInt("RATE_LIMIT_VOTES", 60),
  reactions: envInt("RATE_LIMIT_REACTIONS", 60),
  duplicateCommentWindowMs: envInt(
    "DUPLICATE_COMMENT_WINDOW_MS",
    DEFAULT_DUPLICATE_COMMENT_WINDOW_MS
  ),
};

const adminDistPath = path.resolve(
  process.env.ADMIN_DIST_PATH ?? path.join(__dirname, "../../../apps/admin/dist")
);

const networkBlocksEnabled =
  process.env.NETWORK_BLOCKS_ENABLED?.trim().toLowerCase() === "true";
const addressRetentionMs =
  envInt("ANONYMOUS_PRUNE_AGE_DAYS", DEFAULT_ANONYMOUS_PRUNE_AGE_DAYS) *
  24 *
  60 *
  60 *
  1000;

function parseWebhookSubscriptions(raw: string | undefined) {
  if (!raw) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("WEBHOOK_SUBSCRIPTIONS must be a valid JSON array");
  }
  const result = WebhookSubscriptionsSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `WEBHOOK_SUBSCRIPTIONS is invalid: ${result.error.message}`
    );
  }
  return result.data;
}

const app = buildApp({
  db,
  jwtSecret,
  sessionSecret: process.env.SESSION_SECRET,
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY, {
    allowUnbounded:
      process.env.TRUST_PROXY_ALLOW_UNBOUNDED?.trim().toLowerCase() === "true",
  }),
  googleOAuth,
  discordOAuth,
  clientOrigin: process.env.CLIENT_ORIGIN,
  reactionAllowlist,
  rateLimits,
  networkAddresses: {
    enabled: networkBlocksEnabled,
    retentionMs: addressRetentionMs,
  },
  adminDistPath,
  adminBase: process.env.ADMIN_BASE,
  webhookSubscriptions: parseWebhookSubscriptions(
    process.env.WEBHOOK_SUBSCRIPTIONS
  ),
  webhookTimeoutMs: envInt("WEBHOOK_TIMEOUT_MS", DEFAULT_WEBHOOK_TIMEOUT_MS),
  logger: true,
});

app.listen({ port, host }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening on ${address}`);
});

if (networkBlocksEnabled && addressRetentionMs > 0) {
  const sweep = setInterval(() => {
    pruneExpiredAddresses(db, addressRetentionMs).catch((error) => {
      console.error("Failed to prune captured client addresses", error);
    });
  }, DEFAULT_ADDRESS_SWEEP_INTERVAL_MS);
  sweep.unref();
}
