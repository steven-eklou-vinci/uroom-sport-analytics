-- AlterTable
ALTER TABLE "public"."_ClubToUser" ADD CONSTRAINT "_ClubToUser_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_ClubToUser_AB_unique";

-- CreateTable
CREATE TABLE "public"."PlayerFollow" (
    "id" TEXT NOT NULL,
    "scoutId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerFollow_scoutId_playerId_key" ON "public"."PlayerFollow"("scoutId", "playerId");

-- AddForeignKey
ALTER TABLE "public"."PlayerFollow" ADD CONSTRAINT "PlayerFollow_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerFollow" ADD CONSTRAINT "PlayerFollow_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."PlayerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
