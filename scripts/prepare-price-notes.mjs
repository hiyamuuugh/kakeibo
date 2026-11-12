import { spawnSync } from "node:child_process";
// Production build fails rather than deploying an API without its tables.
if (process.env.VERCEL_ENV === "production") {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "execute", "--file", "prisma/migrations/20261112000000_add_price_notes/migration.sql"], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
