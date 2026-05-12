-- Add nullable first so existing global life areas can be backfilled safely.
ALTER TABLE "LifeArea" ADD COLUMN "userId" TEXT;

-- Backfill existing life areas to an existing user. In a migrated single-user app,
-- this will usually be the first Neon-authenticated app user created.
UPDATE "LifeArea"
SET "userId" = (
    SELECT "id"
    FROM "User"
    ORDER BY "createdAt" ASC
    LIMIT 1
)
WHERE "userId" IS NULL;

-- If there are life areas but no users yet, the next statement will fail.
-- Create/sign in at least one user before running this migration, or manually
-- assign "LifeArea"."userId" before enforcing NOT NULL.
ALTER TABLE "LifeArea" ALTER COLUMN "userId" SET NOT NULL;

CREATE INDEX "LifeArea_userId_name_idx" ON "LifeArea"("userId", "name");

ALTER TABLE "LifeArea" ADD CONSTRAINT "LifeArea_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
