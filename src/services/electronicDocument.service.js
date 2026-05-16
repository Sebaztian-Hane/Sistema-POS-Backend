// services/electronicDocument.service.js
const prisma = require('../libs/prisma');

/**
 * Crear registro de documento electrónico (estado PENDIENTE)
 */
async function crearDocumentoElectronico({
  saleId,
  tipoComprobante,
  serie,
  correlativo,
  fileName,
  payloadJson
}) {
  return prisma.electronicDocument.create({
    data: {
      saleId,
      tipoComprobante,
      serie,
      correlativo,
      fileName,
      payloadJson,
      sunatStatus: 'PENDIENTE',
      enviadoEn: new Date()
    }
  });
}

/**
 * Actualizar estado del documento electrónico
 */
async function actualizarEstadoDocumento({
  saleId,
  estado,
  documentId,
  respuestaSunat,
  observaciones,
  xmlUrl,
  cdrUrl
}) {
  return prisma.electronicDocument.update({
    where: {
      saleId
    },
    data: {
      sunatStatus: estado,
      documentId,
      respuestaSunat,
      observaciones,
      xmlUrl,
      cdrUrl,
      respondedEn: new Date()
    }
  });
}

/**
 * Actualizar solo el estado (sin URLs)
 */
async function actualizarEstadoSimple({
  saleId,
  estado,
  observaciones
}) {
  return prisma.electronicDocument.update({
    where: {
      saleId
    },
    data: {
      sunatStatus: estado,
      observaciones,
      respondedEn: new Date()
    }
  });
}

module.exports = {
  crearDocumentoElectronico,
  actualizarEstadoDocumento,
  actualizarEstadoSimple
};