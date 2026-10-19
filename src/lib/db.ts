import postgres from "postgres";

const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

const DEFAULT_DATABASE_URL =
  "postgresql://neondb_owner:npg_dVqwCkshP1N0@ep-ancient-grass-b4lh6537.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require";

function createClient() {
  const databaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  return postgres(databaseUrl, {
    max: process.env.NODE_ENV === "production" ? 5 : 2,
    idle_timeout: 20,
    ssl: databaseUrl.includes("neon.tech") || databaseUrl.includes("sslmode=require") ? "require" : undefined,
  });
}

export const sql = globalForDb.sql ?? createClient();

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;
