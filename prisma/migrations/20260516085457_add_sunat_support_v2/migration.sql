/*
  Warnings:

  - The values [ENVIADO,ERROR] on the enum `SunatStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `apiResponse` on the `ElectronicDocument` table. All the data in the column will be lost.
  - You are about to drop the column `cdrCode` on the `ElectronicDocument` table. All the data in the column will be lost.
  - You are about to drop the column `cdrDescription` on the `ElectronicDocument` table. All the data in the column will be lost.
  - You are about to drop the column `hash` on the `ElectronicDocument` table. All the data in the column will be lost.
  - You are about to drop the column `qrData` on the `ElectronicDocument` table. All the data in the column will be lost.
  - You are about to drop the column `sentAt` on the `ElectronicDocument` table. All the data in the column will be lost.
  - You are about to drop the column `ticket` on the `ElectronicDocument` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nroDocumento]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[serie,correlativo]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `correlativo` to the `ElectronicDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serie` to the `ElectronicDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipoComprobante` to the `ElectronicDocument` table without a default value. This is not possible if the table is not empty.
  - Made the column `tipoComprobante` on table `Sale` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SunatStatus_new" AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'EXCEPCION', 'ANULADO');
ALTER TABLE "public"."ElectronicDocument" ALTER COLUMN "sunatStatus" DROP DEFAULT;
ALTER TABLE "ElectronicDocument" ALTER COLUMN "sunatStatus" TYPE "SunatStatus_new" USING ("sunatStatus"::text::"SunatStatus_new");
ALTER TYPE "SunatStatus" RENAME TO "SunatStatus_old";
ALTER TYPE "SunatStatus_new" RENAME TO "SunatStatus";
DROP TYPE "public"."SunatStatus_old";
ALTER TABLE "ElectronicDocument" ALTER COLUMN "sunatStatus" SET DEFAULT 'PENDIENTE';
COMMIT;

-- DropIndex
DROP INDEX "ElectronicDocument_fileName_key";

-- AlterTable
ALTER TABLE "ElectronicDocument" DROP COLUMN "apiResponse",
DROP COLUMN "cdrCode",
DROP COLUMN "cdrDescription",
DROP COLUMN "hash",
DROP COLUMN "qrData",
DROP COLUMN "sentAt",
DROP COLUMN "ticket",
ADD COLUMN     "cdrUrl" TEXT,
ADD COLUMN     "correlativo" INTEGER NOT NULL,
ADD COLUMN     "documentId" TEXT,
ADD COLUMN     "enviadoEn" TIMESTAMP(3),
ADD COLUMN     "observaciones" TEXT,
ADD COLUMN     "respondedEn" TIMESTAMP(3),
ADD COLUMN     "respuestaSunat" JSONB,
ADD COLUMN     "serie" TEXT NOT NULL,
ADD COLUMN     "tipoComprobante" "TipoComprobante" NOT NULL,
ADD COLUMN     "xmlUrl" TEXT,
ALTER COLUMN "fileName" DROP NOT NULL,
ALTER COLUMN "payloadJson" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "tipoComprobante" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_nroDocumento_key" ON "Customer"("nroDocumento");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_serie_correlativo_key" ON "Sale"("serie", "correlativo");
