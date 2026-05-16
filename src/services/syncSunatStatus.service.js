const prisma = require("../libs/prisma");
const { getDocumentById } = require("./apisunat.service");

/**
 * Sincronizar un documento específico por su documentId
 * @param {string} documentId - ID del documento en APISUNAT
 * @returns {Promise<Object>} Estado actualizado del documento
 */
const syncDocumentById = async (documentId) => {
  // Consultar estado actual a APISUNAT
  const sunatResponse = await getDocumentById(documentId);
  
  // Buscar el documento electrónico en DB
  const electronicDoc = await prisma.electronicDocument.findFirst({
    where: { documentId }
  });

  if (!electronicDoc) {
    throw new Error(`No se encontró documento electrónico con documentId: ${documentId}`);
  }

  // Actualizar estado en DB
  const updated = await prisma.electronicDocument.update({
    where: { id: electronicDoc.id },
    data: {
      sunatStatus: sunatResponse.status,
      respuestaSunat: sunatResponse,
      xmlUrl: sunatResponse.xml || null,
      cdrUrl: sunatResponse.cdr || null,
      respondedEn: sunatResponse.responseTime
        ? new Date(sunatResponse.responseTime * 1000)
        : new Date(),
      observaciones: JSON.stringify({
        faults: sunatResponse.faults || [],
        notes: sunatResponse.notes || []
      })
    }
  });

  return {
    document: updated,
    sunatResponse
  };
};

/**
 * Sincronizar un documento por saleId
 * @param {number} saleId - ID de la venta
 * @returns {Promise<Object>} Estado actualizado del documento
 */
const syncDocumentBySaleId = async (saleId) => {
  const electronicDoc = await prisma.electronicDocument.findUnique({
    where: { saleId }
  });

  if (!electronicDoc) {
    throw new Error(`No se encontró documento electrónico para la venta ${saleId}`);
  }

  if (!electronicDoc.documentId) {
    throw new Error(`El documento de la venta ${saleId} no tiene documentId`);
  }

  return await syncDocumentById(electronicDoc.documentId);
};

/**
 * Sincronizar todos los documentos pendientes
 */
const syncPendientes = async () => {
  console.log(`[syncSunatStatus] Iniciando sincronización de documentos pendientes...`);
  
  const pendientes = await prisma.electronicDocument.findMany({
    where: {
      sunatStatus: 'PENDIENTE',
      documentId: {
        not: null
      }
    }
  });

  console.log(`[syncSunatStatus] Encontrados ${pendientes.length} documentos pendientes`);

  let successCount = 0;
  let errorCount = 0;

  for (const doc of pendientes) {
    try {
      const result = await syncDocumentById(doc.documentId);
      console.log(`[syncSunatStatus] ✅ Documento ${doc.serie}-${doc.correlativo} actualizado a: ${result.sunatResponse.status}`);
      successCount++;
    } catch (error) {
      console.error(`[syncSunatStatus] ❌ Error sincronizando documento ${doc.id} (${doc.serie}-${doc.correlativo}):`, error.message);
      errorCount++;
    }
  }

  console.log(`[syncSunatStatus] Sincronización finalizada. Éxitos: ${successCount}, Errores: ${errorCount}`);
  return { successCount, errorCount };
};

module.exports = {
  syncPendientes,
  syncDocumentById,
  syncDocumentBySaleId
};