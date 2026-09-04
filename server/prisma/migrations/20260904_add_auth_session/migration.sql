-- CreateTable
CREATE TABLE IF NOT EXISTS "AuthSession" (
    "id" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "userId" TEXT,
    "customerId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");
CREATE INDEX IF NOT EXISTS "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE INDEX IF NOT EXISTS "AuthSession_customerId_idx" ON "AuthSession"("customerId");
CREATE INDEX IF NOT EXISTS "AuthSession_familyId_idx" ON "AuthSession"("familyId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
