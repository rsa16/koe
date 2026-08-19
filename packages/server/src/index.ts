import { buildApp } from "./app.js";
import { createDbClient } from "@koe/db";
import { createGoogleOAuthProvider } from "./oauth.js";
import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const databaseUrl = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/koe";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET must be set in the environment");
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRedirectURI = process.env.GOOGLE_REDIRECT_URI;
const googleOAuth =
  googleClientId && googleClientSecret && googleRedirectURI
    ? createGoogleOAuthProvider(googleClientId, googleClientSecret, googleRedirectURI)
    : undefined;

const db = createDbClient(databaseUrl);
const app = buildApp({
  db,
  jwtSecret,
  googleOAuth,
  clientOrigin: process.env.CLIENT_ORIGIN,
  logger: true,
});

app.listen({ port, host }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening on ${address}`);
});
