import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and point it at a Postgres instance."
  );
}

const poolConfig = {
  connectionString,
  max: Number(process.env.DATABASE_POOL_MAX) || (process.env.NODE_ENV === "production" ? 10 : 3),
  ...(process.env.DATABASE_SSL === "disable"
    ? {}
    : { ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: false } : undefined }),
};

const globalForDb = globalThis;

export const pool =
  process.env.NODE_ENV === "production"
    ? new Pool(poolConfig)
    : (globalForDb.__unilinkPool ??= new Pool(poolConfig));

if (process.env.NODE_ENV !== "production") {
  globalForDb.__unilinkPool = pool;
}
