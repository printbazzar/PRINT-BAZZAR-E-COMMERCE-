-- CreateTable
CREATE TABLE "OtpRequestLog" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "ipHash" TEXT,
    "provider" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OtpRequestLog_mobile_createdAt_idx" ON "OtpRequestLog"("mobile", "createdAt");

-- CreateIndex
CREATE INDEX "OtpRequestLog_ipHash_createdAt_idx" ON "OtpRequestLog"("ipHash", "createdAt");
