-- User-requested one-time reset of all CSV exclusion words across all six sources.
-- The marker and deletion commit atomically. Later deploys preserve newly added words.
BEGIN;
CREATE TABLE IF NOT EXISTS "AppDataMigration" (
  "key" TEXT NOT NULL,
  "affectedRows" INTEGER NOT NULL DEFAULT 0,
  "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppDataMigration_pkey" PRIMARY KEY ("key")
);
DO $$
DECLARE inserted INTEGER;
        deleted INTEGER;
BEGIN
  INSERT INTO "AppDataMigration" ("key") VALUES ('20261118_clear_import_exclusions') ON CONFLICT ("key") DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted = 1 THEN
    DELETE FROM "ImportExclusion";
    GET DIAGNOSTICS deleted = ROW_COUNT;
    UPDATE "AppDataMigration" SET "affectedRows" = deleted WHERE "key" = '20261118_clear_import_exclusions';
    RAISE NOTICE 'Cleared % CSV exclusion words (one-time reset)', deleted;
  END IF;
END $$;
COMMIT;
