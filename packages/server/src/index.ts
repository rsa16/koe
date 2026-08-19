import { buildApp } from "./app.js";
import { createDbClient } from "@koe/db";
import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const databaseUrl = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/koe";

const db = createDbClient(databaseUrl);
const app = buildApp({ db, logger: true });

app.listen({ port, host }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening on ${address}`);
});
