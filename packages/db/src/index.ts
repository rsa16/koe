import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

export * from "./schema/index.js";
export * from "./mem.js";

export type Database = any;

export function createDbClient(connectionStringOrClient: string | postgres.Sql) {
  const client =
    typeof connectionStringOrClient === "string"
      ? postgres(connectionStringOrClient)
      : connectionStringOrClient;
  return drizzle(client, { schema });
}

