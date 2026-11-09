-- AlterTable
ALTER TABLE "public"."PlayerProfile" ADD COLUMN     "profileViews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uroomRank" INTEGER,
ADD COLUMN     "uroomScore" DOUBLE PRECISION DEFAULT 0;
