-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "workflowDefinitionId" TEXT,
ADD COLUMN     "workflowSnapshotJson" TEXT,
ADD COLUMN     "workflowVersion" TEXT DEFAULT 'v1.0.0';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "workflowDefinitionId" TEXT;

-- AlterTable
ALTER TABLE "ProductionJob" ADD COLUMN     "assignedUserId" TEXT,
ADD COLUMN     "checklistResponsesJson" TEXT,
ADD COLUMN     "department" TEXT DEFAULT 'PRODUCTION',
ADD COLUMN     "dependsOnJobId" TEXT,
ADD COLUMN     "operatorName" TEXT,
ADD COLUMN     "producedQty" INTEGER,
ADD COLUMN     "reworkCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reworkReason" TEXT,
ADD COLUMN     "reworkTargetJobId" TEXT,
ADD COLUMN     "stageCode" TEXT,
ADD COLUMN     "stageName" TEXT,
ADD COLUMN     "stageOrder" INTEGER DEFAULT 1,
ADD COLUMN     "targetDueAt" TIMESTAMP(3),
ADD COLUMN     "wastagePercentage" DOUBLE PRECISION,
ADD COLUMN     "wastageQty" INTEGER,
ADD COLUMN     "workflowDefinitionId" TEXT,
ADD COLUMN     "workflowStageId" TEXT;

-- AlterTable
ALTER TABLE "QualityCheck" ADD COLUMN     "inspectorId" TEXT,
ADD COLUMN     "photoEvidenceUrl" TEXT,
ADD COLUMN     "reworkTargetDepartment" TEXT,
ADD COLUMN     "reworkTargetStageId" TEXT;

-- CreateTable
CREATE TABLE "WorkflowDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1.0.0',
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStage" (
    "id" TEXT NOT NULL,
    "workflowDefinitionId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "stageName" TEXT NOT NULL,
    "stageCode" TEXT NOT NULL,
    "stageOrder" INTEGER NOT NULL,
    "slaMinutes" INTEGER NOT NULL DEFAULT 480,
    "triggerType" TEXT NOT NULL DEFAULT 'ALWAYS',
    "requireChecklist" BOOLEAN NOT NULL DEFAULT true,
    "reworkDepartment" TEXT DEFAULT 'PRODUCTION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStageChecklist" (
    "id" TEXT NOT NULL,
    "workflowStageId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "inputType" TEXT NOT NULL DEFAULT 'CHECKBOX',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowStageChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobStatusHistory" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "changedById" TEXT,
    "changedByName" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowDefinition_code_key" ON "WorkflowDefinition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStage_workflowDefinitionId_stageOrder_key" ON "WorkflowStage"("workflowDefinitionId", "stageOrder");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_dependsOnJobId_fkey" FOREIGN KEY ("dependsOnJobId") REFERENCES "ProductionJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_workflowStageId_fkey" FOREIGN KEY ("workflowStageId") REFERENCES "WorkflowStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStage" ADD CONSTRAINT "WorkflowStage_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStageChecklist" ADD CONSTRAINT "WorkflowStageChecklist_workflowStageId_fkey" FOREIGN KEY ("workflowStageId") REFERENCES "WorkflowStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobStatusHistory" ADD CONSTRAINT "JobStatusHistory_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ProductionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

