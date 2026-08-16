/*
  Warnings:

  - The values [ADMIN] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `assignedTo` on the `Officer` table. All the data in the column will be lost.
  - You are about to drop the column `subCity` on the `Officer` table. All the data in the column will be lost.
  - The `status` column on the `Property` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Unit` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `SystemAdministrator` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `officeId` to the `Officer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `officeId` to the `RentalAgreement` table without a default value. This is not possible if the table is not empty.
  - Made the column `referenceNumber` on table `RentalAgreement` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('NONE', 'TELEBIRR', 'BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "OfficeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'DEACTIVATE', 'ACTIVATE', 'PAYMENT_RECORDED');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'OFFICE_ADMIN', 'OFFICER', 'LANDLORD', 'TENANT');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "SystemAdministrator" DROP CONSTRAINT "SystemAdministrator_userId_fkey";

-- AlterTable
ALTER TABLE "Landlord" ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "houseNumber" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Officer" DROP COLUMN "assignedTo",
DROP COLUMN "subCity",
ADD COLUMN     "assignedArea" TEXT,
ADD COLUMN     "officeId" INTEGER NOT NULL,
ADD COLUMN     "position" TEXT;

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "status",
ADD COLUMN     "status" "PropertyStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "RentalAgreement" ADD COLUMN     "officeId" INTEGER NOT NULL,
ALTER COLUMN "referenceNumber" SET NOT NULL;

-- AlterTable
ALTER TABLE "Unit" ALTER COLUMN "floor" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "UnitStatus" NOT NULL DEFAULT 'AVAILABLE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email" TEXT,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "nationalId" DROP NOT NULL;

-- DropTable
DROP TABLE "SystemAdministrator";

-- CreateTable
CREATE TABLE "SuperAdmin" (
    "superAdminId" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("superAdminId")
);

-- CreateTable
CREATE TABLE "GovernmentOffice" (
    "officeId" SERIAL NOT NULL,
    "officeCode" TEXT NOT NULL,
    "officeName" TEXT NOT NULL,
    "region" TEXT,
    "city" TEXT,
    "subCity" TEXT,
    "woreda" TEXT,
    "address" TEXT,
    "status" "OfficeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovernmentOffice_pkey" PRIMARY KEY ("officeId")
);

-- CreateTable
CREATE TABLE "OfficeAdmin" (
    "officeAdminId" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "officeId" INTEGER NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficeAdmin_pkey" PRIMARY KEY ("officeAdminId")
);

-- CreateTable
CREATE TABLE "Payment" (
    "paymentId" SERIAL NOT NULL,
    "agreementId" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" "PaymentMethod",
    "provider" "PaymentProvider" NOT NULL DEFAULT 'NONE',
    "transactionReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("paymentId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "auditId" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER,
    "description" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("auditId")
);

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdmin_userId_key" ON "SuperAdmin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GovernmentOffice_officeCode_key" ON "GovernmentOffice"("officeCode");

-- CreateIndex
CREATE INDEX "GovernmentOffice_region_idx" ON "GovernmentOffice"("region");

-- CreateIndex
CREATE INDEX "GovernmentOffice_city_idx" ON "GovernmentOffice"("city");

-- CreateIndex
CREATE INDEX "GovernmentOffice_subCity_idx" ON "GovernmentOffice"("subCity");

-- CreateIndex
CREATE INDEX "GovernmentOffice_woreda_idx" ON "GovernmentOffice"("woreda");

-- CreateIndex
CREATE UNIQUE INDEX "OfficeAdmin_userId_key" ON "OfficeAdmin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OfficeAdmin_employeeId_key" ON "OfficeAdmin"("employeeId");

-- CreateIndex
CREATE INDEX "OfficeAdmin_officeId_idx" ON "OfficeAdmin"("officeId");

-- CreateIndex
CREATE INDEX "Payment_agreementId_idx" ON "Payment"("agreementId");

-- CreateIndex
CREATE INDEX "Payment_dueDate_idx" ON "Payment"("dueDate");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_transactionReference_key" ON "Payment"("provider", "transactionReference");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Officer_officeId_idx" ON "Officer"("officeId");

-- CreateIndex
CREATE INDEX "Property_subCity_idx" ON "Property"("subCity");

-- CreateIndex
CREATE INDEX "Property_woreda_idx" ON "Property"("woreda");

-- CreateIndex
CREATE INDEX "RentalAgreement_officeId_idx" ON "RentalAgreement"("officeId");

-- CreateIndex
CREATE INDEX "RentalAgreement_status_idx" ON "RentalAgreement"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "SuperAdmin" ADD CONSTRAINT "SuperAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeAdmin" ADD CONSTRAINT "OfficeAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeAdmin" ADD CONSTRAINT "OfficeAdmin_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "GovernmentOffice"("officeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Officer" ADD CONSTRAINT "Officer_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "GovernmentOffice"("officeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalAgreement" ADD CONSTRAINT "RentalAgreement_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "GovernmentOffice"("officeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "RentalAgreement"("agreementId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
