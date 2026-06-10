import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let cachedDb: Database | null = null;

export function getDb(): Database {
  if (cachedDb) {
    return cachedDb;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  const client = postgres(connectionString, {
    max: 1,
    prepare: false
  });

  cachedDb = drizzle(client, { schema });
  return cachedDb;
}
