-- AlterTable
ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
                  ADD COLUMN "loginBlockedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
                      ADD COLUMN "loginBlockedUntil" TIMESTAMP(3);
