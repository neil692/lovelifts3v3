-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SCOREKEEPER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'ADMIN';
