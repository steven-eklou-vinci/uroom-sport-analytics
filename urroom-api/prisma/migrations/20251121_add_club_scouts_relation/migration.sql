-- AlterTable: Ajouter colonne clubId aux Users (pour scouts)
ALTER TABLE "User" ADD COLUMN "clubId" TEXT;

-- AlterTable: Ajouter subscriptionTier aux Clubs
ALTER TABLE "Club" ADD COLUMN "subscriptionTier" TEXT NOT NULL DEFAULT 'FREE';

-- Migrer les données de _ClubToUser vers clubId pour les scouts uniquement
UPDATE "User" 
SET "clubId" = (
  SELECT "A" FROM "_ClubToUser" 
  WHERE "_ClubToUser"."B" = "User"."id" 
  LIMIT 1
)
WHERE "role" = 'SCOUT';

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropTable (on garde _ClubToUser pour les propriétaires de clubs)
-- Pas de suppression pour l'instant, on garde la relation many-to-many pour CLUB owners
