-- CreateEnum
CREATE TYPE "PlayerDataSource" AS ENUM ('PLATFORM_DATA', 'SCOUT_CREATED');

-- AlterTable
ALTER TABLE "PlayerProfile" 
  ALTER COLUMN "birthDate" DROP NOT NULL,
  ADD COLUMN "age" INTEGER,
  ALTER COLUMN "nationality" DROP NOT NULL,
  ALTER COLUMN "foot" DROP NOT NULL,
  ADD COLUMN "dataSource" "PlayerDataSource" NOT NULL DEFAULT 'PLATFORM_DATA',
  ADD COLUMN "createdByScoutId" TEXT;

-- AlterTable
ALTER TABLE "Report" 
  ALTER COLUMN "clubFit" SET DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ProPlayerProfile"
  DROP CONSTRAINT IF EXISTS "ProPlayerProfile_name_key";

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_createdByScoutId_fkey" 
  FOREIGN KEY ("createdByScoutId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
