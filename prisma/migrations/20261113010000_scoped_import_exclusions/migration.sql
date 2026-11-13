-- Preserve all previous exclusions by copying each one to every supported source.
-- Transactional and repeatable; never changes imported transactions.
BEGIN;
ALTER TABLE "ImportExclusion" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'all';
DROP INDEX IF EXISTS "ImportExclusion_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ImportExclusion_source_name_key" ON "ImportExclusion"("source", "name");
INSERT INTO "ImportExclusion" ("id", "name", "source", "createdAt")
SELECT old."id" || '-' || sources."source", old."name", sources."source", old."createdAt"
FROM "ImportExclusion" old
CROSS JOIN (VALUES ('paypay'), ('paypay-card'), ('rakuten'), ('saison'), ('mufg'), ('smbc')) AS sources("source")
WHERE old."source" = 'all'
ON CONFLICT ("source", "name") DO NOTHING;
DELETE FROM "ImportExclusion" WHERE "source" = 'all';
ALTER TABLE "ImportExclusion" ALTER COLUMN "source" DROP DEFAULT;
COMMIT;
