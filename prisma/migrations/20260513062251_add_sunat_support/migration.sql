/*
  Warnings:

  - Added the required column `total` to the `SaleItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valorUnitario` to the `SaleItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoComprobante" AS ENUM ('BOLETA', 'FACTURA', 'NOTA_CREDITO');

-- CreateEnum
CREATE TYPE "SunatStatus" AS ENUM ('PENDIENTE', 'ENVIADO', 'ACEPTADO', 'RECHAZADO', 'ERROR');

-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('PEN', 'USD');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "razonSocial" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "correlativo" INTEGER,
ADD COLUMN     "currency" "CurrencyCode" NOT NULL DEFAULT 'PEN',
ADD COLUMN     "fechaEmision" TIMESTAMP(3),
ADD COLUMN     "igv" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "serie" TEXT,
ADD COLUMN     "tipoComprobante" "TipoComprobante";

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "igv" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "valorUnitario" DECIMAL(10,2) NOT NULL;

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "ruc" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "nombreComercial" TEXT,
    "direccion" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "personaId" TEXT NOT NULL,
    "personaToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSeries" (
    "id" SERIAL NOT NULL,
    "tipoComprobante" "TipoComprobante" NOT NULL,
    "serie" TEXT NOT NULL,
    "correlativoActual" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectronicDocument" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "apiResponse" JSONB,
    "hash" TEXT,
    "qrData" TEXT,
    "cdrCode" TEXT,
    "cdrDescription" TEXT,
    "ticket" TEXT,
    "sunatStatus" "SunatStatus" NOT NULL DEFAULT 'PENDIENTE',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectronicDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_ruc_key" ON "Company"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSeries_serie_key" ON "DocumentSeries"("serie");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicDocument_saleId_key" ON "ElectronicDocument"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicDocument_fileName_key" ON "ElectronicDocument"("fileName");

-- AddForeignKey
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
