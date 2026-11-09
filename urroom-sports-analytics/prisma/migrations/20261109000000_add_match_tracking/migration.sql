-- CreateEnum
CREATE TYPE "public"."MatchAnalysisStatus" AS ENUM ('UPLOADED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."MatchAnalysis" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "matchDate" TIMESTAMP(3),
    "opponent" TEXT,
    "videoUrl" TEXT NOT NULL,
    "status" "public"."MatchAnalysisStatus" NOT NULL DEFAULT 'UPLOADED',
    "analysisJobId" TEXT,
    "processedFrames" INTEGER,
    "fps" DOUBLE PRECISION,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "MatchAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MatchPlayerTracking" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "trackId" INTEGER NOT NULL,
    "objectClass" TEXT NOT NULL,
    "playerId" TEXT,
    "team" TEXT,

    CONSTRAINT "MatchPlayerTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MatchPlayerStatistic" (
    "id" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,

    CONSTRAINT "MatchPlayerStatistic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchAnalysis_analysisJobId_key" ON "public"."MatchAnalysis"("analysisJobId");

-- CreateIndex
CREATE INDEX "MatchAnalysis_createdById_createdAt_idx" ON "public"."MatchAnalysis"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "MatchAnalysis_status_idx" ON "public"."MatchAnalysis"("status");

-- CreateIndex
CREATE INDEX "MatchPlayerTracking_playerId_idx" ON "public"."MatchPlayerTracking"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchPlayerTracking_matchId_trackId_key" ON "public"."MatchPlayerTracking"("matchId", "trackId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchPlayerStatistic_trackingId_key_key" ON "public"."MatchPlayerStatistic"("trackingId", "key");

-- AddForeignKey
ALTER TABLE "public"."MatchAnalysis" ADD CONSTRAINT "MatchAnalysis_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchPlayerTracking" ADD CONSTRAINT "MatchPlayerTracking_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."MatchAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchPlayerTracking" ADD CONSTRAINT "MatchPlayerTracking_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."PlayerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchPlayerStatistic" ADD CONSTRAINT "MatchPlayerStatistic_trackingId_fkey" FOREIGN KEY ("trackingId") REFERENCES "public"."MatchPlayerTracking"("id") ON DELETE CASCADE ON UPDATE CASCADE;