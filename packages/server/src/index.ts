import { buildApp } from "./app.js";
import { createDbClient } from "@koe/db";
import { createGoogleOAuthProvider } from "./oauth.js";
import {
  DEFAULT_DUPLICATE_COMMENT_WINDOW_MS,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
} from "./plugins/rate-limit.js";
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

const app = buildApp({
  db,
  jwtSecret,
  sessionSecret: process.env.SESSION_SECRET,
  googleOAuth,
  clientOrigin: process.env.CLIENT_ORIGIN,
  reactionAllowlist,
  rateLimits,
  adminDistPath,
  logger: true,
});

app.listen({ port, host }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening on ${address}`);
});
