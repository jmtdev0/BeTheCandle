import { Pool } from "pg";

let pool: Pool | null = null;

export function getDbPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required to access the database");
  }

  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 5,
    idleTimeoutMillis: 30_000,
  });

  pool.on("error", (err: Error) => {
    console.error("Postgres pool error", err);
  });

  return pool;
}

export async function withDb<T>(callback: (client: Pool) => Promise<T>) {
  const db = getDbPool();
  return callback(db);
}
