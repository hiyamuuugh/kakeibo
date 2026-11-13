import { spawnSync } from "node:child_process";
// Apply additive/idempotent app migrations; preserve existing records.
if (process.env.VERCEL_ENV === "production" || process.argv.includes("--apply")) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  for (const migration of ["20261112000000_add_price_notes", "20261112010000_optional_price_quantity", "20261113000000_cash_flow_plan"]) {
    const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "execute", "--file", `prisma/migrations/${migration}/migration.sql`], { stdio: "inherit" });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
