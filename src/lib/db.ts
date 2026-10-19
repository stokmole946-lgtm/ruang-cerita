import postgres from "postgres";

const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

function createClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL belum diatur");
  return postgres(databaseUrl, {
    max: process.env.NODE_ENV === "production" ? 5 : 2,
    idle_timeout: 20,
  });
}

export const sql = globalForDb.sql ?? createClient();

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;
