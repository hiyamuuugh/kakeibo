import { spawnSync } from "node:child_process";
// Apply idempotent schema migrations and explicitly requested, marker-guarded data resets.
if (process.env.VERCEL_ENV === "production" || process.argv.includes("--apply")) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  for (const migration of ["20261112000000_add_price_notes", "20261112010000_optional_price_quantity", "20261113000000_cash_flow_plan", "20261113010000_scoped_import_exclusions", "20261118000000_member_birth_date", "20261118010000_csv_import_months", "20261118020000_monthly_budget_plan", "20261118030000_csv_reminder_ack", "20261118040000_clear_import_exclusions"]) {
    const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "execute", "--file", `prisma/migrations/${migration}/migration.sql`], { stdio: "inherit" });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
