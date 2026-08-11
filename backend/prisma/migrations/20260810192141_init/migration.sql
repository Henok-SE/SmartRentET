-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('LANDLORD', 'TENANT', 'OFFICER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'TERMINATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('REVIEW', 'FINAL_APPROVAL');

-- CreateTable
CREATE TABLE "User" (
    "userId" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "nationalId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Landlord" (
    "landlordId" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "businessLicense" TEXT,
    "bankAccountNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Landlord_pkey" PRIMARY KEY ("landlordId")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "tenantId" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "employer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "SystemAdministrator" (
    "adminId" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemAdministrator_pkey" PRIMARY KEY ("adminId")
);

-- CreateTable
CREATE TABLE "Property" (
    "propertyId" SERIAL NOT NULL,
    "landlordId" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "subCity" TEXT NOT NULL,
    "woreda" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "numberOfUnits" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("propertyId")
);

-- CreateTable
CREATE TABLE "Unit" (
    "unitId" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "sizeSqMeters" DECIMAL(65,30) NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "rentAmountFloor" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("unitId")
);

-- CreateTable
CREATE TABLE "RentalAgreement" (
    "agreementId" SERIAL NOT NULL,
    "referenceNumber" TEXT,
    "unitId" INTEGER NOT NULL,
    "landlordId" INTEGER NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "paymentFrequencyId" INTEGER NOT NULL,
    "monthlyRent" DECIMAL(65,30) NOT NULL,
    "securityDeposit" DECIMAL(65,30),
    "status" "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "terminationDate" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "previousAgreementId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalAgreement_pkey" PRIMARY KEY ("agreementId")
);

-- CreateTable
CREATE TABLE "PaymentFrequency" (
    "frequencyId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "minimumInterval" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentFrequency_pkey" PRIMARY KEY ("frequencyId")
);

-- CreateTable
CREATE TABLE "Officer" (
    "officerId" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "employeeId" TEXT NOT NULL,
    "subCity" TEXT NOT NULL,
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Officer_pkey" PRIMARY KEY ("officerId")
);

-- CreateTable
CREATE TABLE "AgreementApproval" (
    "approvalId" SERIAL NOT NULL,
    "agreementId" INTEGER NOT NULL,
    "officerId" INTEGER NOT NULL,
    "approvalType" "ApprovalType" NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "comments" TEXT,
    "approvalDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementApproval_pkey" PRIMARY KEY ("approvalId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_nationalId_key" ON "User"("nationalId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Landlord_userId_key" ON "Landlord"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_userId_key" ON "Tenant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemAdministrator_userId_key" ON "SystemAdministrator"("userId");

-- CreateIndex
CREATE INDEX "Property_landlordId_idx" ON "Property"("landlordId");

-- CreateIndex
CREATE INDEX "Unit_propertyId_idx" ON "Unit"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_propertyId_unitNumber_key" ON "Unit"("propertyId", "unitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RentalAgreement_referenceNumber_key" ON "RentalAgreement"("referenceNumber");

-- CreateIndex
CREATE INDEX "RentalAgreement_unitId_idx" ON "RentalAgreement"("unitId");

-- CreateIndex
CREATE INDEX "RentalAgreement_landlordId_idx" ON "RentalAgreement"("landlordId");

-- CreateIndex
CREATE INDEX "RentalAgreement_tenantId_idx" ON "RentalAgreement"("tenantId");

-- CreateIndex
CREATE INDEX "RentalAgreement_paymentFrequencyId_idx" ON "RentalAgreement"("paymentFrequencyId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentFrequency_name_key" ON "PaymentFrequency"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Officer_userId_key" ON "Officer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Officer_employeeId_key" ON "Officer"("employeeId");

-- CreateIndex
CREATE INDEX "AgreementApproval_agreementId_idx" ON "AgreementApproval"("agreementId");

-- CreateIndex
CREATE INDEX "AgreementApproval_officerId_idx" ON "AgreementApproval"("officerId");

-- AddForeignKey
ALTER TABLE "Landlord" ADD CONSTRAINT "Landlord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemAdministrator" ADD CONSTRAINT "SystemAdministrator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("landlordId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("propertyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalAgreement" ADD CONSTRAINT "RentalAgreement_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("unitId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalAgreement" ADD CONSTRAINT "RentalAgreement_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("landlordId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalAgreement" ADD CONSTRAINT "RentalAgreement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalAgreement" ADD CONSTRAINT "RentalAgreement_paymentFrequencyId_fkey" FOREIGN KEY ("paymentFrequencyId") REFERENCES "PaymentFrequency"("frequencyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalAgreement" ADD CONSTRAINT "RentalAgreement_previousAgreementId_fkey" FOREIGN KEY ("previousAgreementId") REFERENCES "RentalAgreement"("agreementId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Officer" ADD CONSTRAINT "Officer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementApproval" ADD CONSTRAINT "AgreementApproval_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "RentalAgreement"("agreementId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementApproval" ADD CONSTRAINT "AgreementApproval_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("officerId") ON DELETE RESTRICT ON UPDATE CASCADE;
