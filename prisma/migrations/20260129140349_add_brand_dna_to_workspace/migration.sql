-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "brandColors" TEXT[],
ADD COLUMN     "brandLogoUrl" TEXT,
ADD COLUMN     "brandName" TEXT,
ADD COLUMN     "brandVoice" TEXT,
ADD COLUMN     "brandWebsite" TEXT,
ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 10;
