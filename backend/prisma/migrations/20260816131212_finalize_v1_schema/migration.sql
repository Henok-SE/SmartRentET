/*
  Warnings:

  - The values [PENDING_REVIEW] on the enum `AgreementStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `monthlyRent` on the `RentalAgreement` table. All the data in the column will be lost.
  - You are about to drop the column `renewalDate` on the `RentalAgreement` table. All the data in the column will be lost.
  - You are about to drop the column `securityDeposit` on the `RentalAgreement` table. All the data in the column will be lost.
  - Added the required column `createdByOfficerId` to the `RentalAgreement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `durationUnit` to the `RentalAgreement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `durationValue` to the `RentalAgreement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `houseNumber` to the `RentalAgreement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `houseType` to the `RentalAgreement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numberOfBathrooms` to the `RentalAgreement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numberOfDoors` to the `RentalAgreement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numberOfRooms` to the `RentalAgreement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numberOfWindows` to the `RentalAgreement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rentalAmount` to the `RentalAgreement` table without a default value. This is not possible if the table is not empty.
  - Made the column `phone` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "VerificationParty" AS ENUM ('LANDLORD', 'TENANT');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "ServiceFeeStatus" AS ENUM ('PENDING', 'INITIATED', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RentalDurationUnit" AS ENUM ('MONTH', 'YEAR');

-- AlterEnum
BEGIN;
CREATE TYPE "AgreementStatus_new" AS ENUM ('DRAFT', 'PENDING_VERIFICATION', 'PENDING_SERVICE_FEE', 'APPROVED', 'REJECTED', 'ACTIVE', 'TERMINATED', 'EXPIRED');
ALTER TABLE "public"."RentalAgreement" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "RentalAgreement" ALTER COLUMN "status" TYPE "AgreementStatus_new" USING ("status"::text::"AgreementStatus_new");
ALTER TYPE "AgreementStatus" RENAME TO "AgreementStatus_old";
ALTER TYPE "AgreementStatus_new" RENAME TO "AgreementStatus";
DROP TYPE "public"."AgreementStatus_old";
ALTER TABLE "RentalAgreement" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'VERIFICATION_SENT';
ALTER TYPE "AuditAction" ADD VALUE 'VERIFICATION_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'SERVICE_FEE_INITIATED';
ALTER TYPE "AuditAction" ADD VALUE 'SERVICE_FEE_PAID';

-- AlterTable
ALTER TABLE "Landlord" ADD COLUMN     "subCity" TEXT,
ADD COLUMN     "woreda" TEXT;

-- AlterTable
ALTER TABLE "RentalAgreement" DROP COLUMN "monthlyRent",
DROP COLUMN "renewalDate",
DROP COLUMN "securityDeposit",
ADD COLUMN     "advancePayment" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "bothPartiesVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "createdByOfficerId" INTEGER NOT NULL,
ADD COLUMN     "durationUnit" "RentalDurationUnit" NOT NULL,
ADD COLUMN     "durationValue" INTEGER NOT NULL,
ADD COLUMN     "houseItems" TEXT,
ADD COLUMN     "houseNumber" TEXT NOT NULL,
ADD COLUMN     "houseType" TEXT NOT NULL,
ADD COLUMN     "numberOfBathrooms" INTEGER NOT NULL,
ADD COLUMN     "numberOfDoors" INTEGER NOT NULL,
ADD COLUMN     "numberOfRooms" INTEGER NOT NULL,
ADD COLUMN     "numberOfWindows" INTEGER NOT NULL,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "rentalAmount" DECIMAL(65,30) NOT NULL;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "address" TEXT,
ADD COLUMN     "houseNumber" TEXT,
ADD COLUMN     "subCity" TEXT,
ADD COLUMN     "woreda" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "username" DROP NOT NULL,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AgreementVerification" (
    "verificationId" SERIAL NOT NULL,
    "agreementId" INTEGER NOT NULL,
    "party" "VerificationParty" NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgreementVerification_pkey" PRIMARY KEY ("verificationId")
);

-- CreateTable
CREATE TABLE "ServiceFeePayment" (
    "serviceFeePaymentId" SERIAL NOT NULL,
    "agreementId" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 50,
    "status" "ServiceFeeStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "PaymentProvider" NOT NULL DEFAULT 'TELEBIRR',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'MOBILE_MONEY',
    "transactionReference" TEXT,
    "externalRequestId" TEXT,
    "initiatedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceFeePayment_pkey" PRIMARY KEY ("serviceFeePaymentId")
);

-- CreateIndex
CREATE INDEX "AgreementVerification_agreementId_idx" ON "AgreementVerification"("agreementId");

-- CreateIndex
CREATE INDEX "AgreementVerification_phoneNumber_idx" ON "AgreementVerification"("phoneNumber");

-- CreateIndex
CREATE INDEX "AgreementVerification_status_idx" ON "AgreementVerification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AgreementVerification_agreementId_party_key" ON "AgreementVerification"("agreementId", "party");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceFeePayment_agreementId_key" ON "ServiceFeePayment"("agreementId");

-- CreateIndex
CREATE INDEX "ServiceFeePayment_status_idx" ON "ServiceFeePayment"("status");

-- CreateIndex
CREATE INDEX "ServiceFeePayment_transactionReference_idx" ON "ServiceFeePayment"("transactionReference");

-- CreateIndex
CREATE INDEX "ServiceFeePayment_externalRequestId_idx" ON "ServiceFeePayment"("externalRequestId");

-- CreateIndex
CREATE INDEX "RentalAgreement_createdByOfficerId_idx" ON "RentalAgreement"("createdByOfficerId");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "RentalAgreement" ADD CONSTRAINT "RentalAgreement_createdByOfficerId_fkey" FOREIGN KEY ("createdByOfficerId") REFERENCES "Officer"("officerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementVerification" ADD CONSTRAINT "AgreementVerification_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "RentalAgreement"("agreementId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceFeePayment" ADD CONSTRAINT "ServiceFeePayment_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "RentalAgreement"("agreementId") ON DELETE RESTRICT ON UPDATE CASCADE;
