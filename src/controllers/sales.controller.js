const salesService = require("../services/sales.service");
const { parsePagination, buildPaginationMeta } = require("../helpers/pagination.helper");
const { getPdfUrl, getDocumentById, sendBill } = require("../services/apisunat.service");
const { generarComprobanteJson } = require("../utils/generarComprobanteJson");
const { actualizarEstadoDocumento } = require("../services/electronicDocument.service");

async function list(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    let userId;
    if (req.query.userId !== undefined && req.query.userId !== "") {
      const uid = parseInt(String(req.query.userId), 10);
      if (Number.isFinite(uid)) {
        userId = uid;
      }
    }

    let customerId;
    if (req.query.customerId !== undefined && req.query.customerId !== "") {
      const cid = parseInt(String(req.query.customerId), 10);
      if (Number.isFinite(cid)) {
        customerId = cid;
      }
    }

    let from, to;
    if (req.query.from) {
      const fromDate = new Date(String(req.query.from));
      if (!Number.isNaN(fromDate.getTime())) {
        from = fromDate;
      }
    }
    if (req.query.to) {
      const toDate = new Date(String(req.query.to));
      if (!Number.isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        to = toDate;
      }
    }

    const { total, data } = await salesService.list(skip, limit, userId, from, to, customerId);

    res.json({
      data,
      meta: buildPaginationMeta(total, page, limit),
    });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const sale = await salesService.getOne(id);

    if (!sale) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    res.json(sale);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const body = req.body ?? {};
    
    const { 
      documentoCliente,
      tipoComprobante,
      items, 
      payments, 
      descuento: extraDescuentoRaw, 
      status 
    } = body;

    // ============================================================
    // VALIDACIÓN #1: tipoComprobante es OBLIGATORIO
    // ============================================================
    if (!tipoComprobante) {
      return res.status(400).json({ 
        message: "tipoComprobante es obligatorio. Valores permitidos: 'FACTURA' o 'BOLETA'" 
      });
    }

    const tiposPermitidos = ['FACTURA', 'BOLETA'];
    if (!tiposPermitidos.includes(tipoComprobante)) {
      return res.status(400).json({ 
        message: "tipoComprobante debe ser 'FACTURA' o 'BOLETA'" 
      });
    }

    // ============================================================
    // VALIDACIÓN #2: FACTURA REQUIERE RUC
    // ============================================================
    if (tipoComprobante === 'FACTURA') {
      if (!documentoCliente) {
        return res.status(400).json({
          message: "Factura requiere RUC del cliente"
        });
      }
      
      const docLimpio = String(documentoCliente).trim();
      if (docLimpio.length !== 11) {
        return res.status(400).json({
          message: "Factura requiere RUC válido de 11 dígitos"
        });
      }
      
      if (!/^\d+$/.test(docLimpio)) {
        return res.status(400).json({
          message: "RUC debe contener solo números"
        });
      }
    }

    // ============================================================
    // VALIDACIÓN #3: BOLETA - DOCUMENTO ES OPCIONAL
    // ============================================================
    if (tipoComprobante === 'BOLETA' && documentoCliente) {
      const docLimpio = String(documentoCliente).trim();
      if (docLimpio.length !== 8 && docLimpio.length !== 11) {
        return res.status(400).json({
          message: "documentoCliente para BOLETA debe ser DNI (8 dígitos) o RUC (11 dígitos)"
        });
      }
      
      if (!/^\d+$/.test(docLimpio)) {
        return res.status(400).json({
          message: "Documento debe contener solo números"
        });
      }
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items debe ser un array no vacío" });
    }
    
    if (!Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ message: "payments debe ser un array no vacío" });
    }

    const userId = req.user.id;

    const sale = await salesService.create({
      userId,
      documentoCliente,
      tipoComprobante,
      items,
      payments,
      extraDescuentoRaw,
      status,
    });

    res.status(201).json({
      ok: true,
      message: "Venta creada exitosamente",
      data: {
        id: sale.id,
        documento: `${sale.serie}-${String(sale.correlativo).padStart(8, '0')}`,
        tipoComprobante: sale.tipoComprobante,
        serie: sale.serie,
        correlativo: sale.correlativo,
        fechaEmision: sale.fechaEmision,
        total: sale.total,
        customer: sale.customer,
        electronicDocument: sale.electronicDocument,
      }
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

async function anular(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const { motivo } = req.body;
    const result = await salesService.anular(id, motivo || "ANULACION DE VENTA");

    res.json({
      ok: true,
      message: "Venta anulada exitosamente",
      data: result
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

// ============================================================
// NUEVOS ENDPOINTS
// ============================================================

/**
 * GET /sales/:id/pdf
 * Obtener URL del PDF del comprobante (APISUNAT)
 */
async function getPdf(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const sale = await salesService.getOne(id);
    if (!sale) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    const electronicDoc = sale.electronicDocument;
    if (!electronicDoc || !electronicDoc.documentId) {
      return res.status(404).json({ 
        message: "Documento electrónico no encontrado o aún no tiene documentId" 
      });
    }

    const format = req.query.format || "ticket80mm";
    const pdfUrl = getPdfUrl(
      electronicDoc.documentId,
      format,
      electronicDoc.fileName || `${sale.serie}-${String(sale.correlativo).padStart(8, '0')}`
    );

    res.json({
      ok: true,
      pdfUrl,
      format
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /sales/:id/sunat-status
 * Consultar estado actual del comprobante en SUNAT
 */
async function getSunatStatus(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const sale = await salesService.getOne(id);
    if (!sale) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    const electronicDoc = sale.electronicDocument;
    if (!electronicDoc || !electronicDoc.documentId) {
      return res.status(404).json({ 
        message: "Documento electrónico no encontrado o aún no tiene documentId" 
      });
    }

    // Consultar estado actual a APISUNAT
    const sunatResponse = await getDocumentById(electronicDoc.documentId);

    // Actualizar estado en DB
    await actualizarEstadoDocumento({
      saleId: sale.id,
      estado: sunatResponse.status,
      documentId: electronicDoc.documentId,
      respuestaSunat: sunatResponse,
      observaciones: JSON.stringify({
        faults: sunatResponse.faults || [],
        notes: sunatResponse.notes || []
      }),
      xmlUrl: sunatResponse.xml || null,
      cdrUrl: sunatResponse.cdr || null
    });

    res.json({
      ok: true,
      sunatStatus: sunatResponse.status,
      details: {
        production: sunatResponse.production,
        issueTime: sunatResponse.issueTime,
        responseTime: sunatResponse.responseTime,
        faults: sunatResponse.faults || [],
        notes: sunatResponse.notes || []
      }
    });
  } catch (err) {
    console.error('Error consultando estado SUNAT:', err);
    res.status(500).json({
      ok: false,
      message: err.message || "Error al consultar estado en SUNAT"
    });
  }
}

/**
 * GET /sales/:id/electronic-document
 * Obtener documento electrónico completo
 */
async function getElectronicDocument(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const electronicDoc = await salesService.getElectronicDocumentBySaleId(id);

    if (!electronicDoc) {
      return res.status(404).json({ 
        message: "Documento electrónico no encontrado para esta venta" 
      });
    }

    res.json({
      ok: true,
      data: electronicDoc
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /sales/:id/retry-sunat
 * Reenviar comprobante a SUNAT (útil si falló la primera vez)
 */
async function retrySunat(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const sale = await salesService.getOne(id);
    if (!sale) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    // Verificar que la venta esté COMPLETADA
    if (sale.status !== "COMPLETADA") {
      return res.status(400).json({ 
        message: "Solo se pueden reenviar comprobantes de ventas COMPLETADAS" 
      });
    }

    // Verificar si ya tiene documentId (no reenviar si ya fue aceptado)
    if (sale.electronicDocument?.documentId) {
      const existingDoc = sale.electronicDocument;
      if (existingDoc.sunatStatus === 'ACEPTADO') {
        return res.status(400).json({ 
          message: "El comprobante ya fue ACEPTADO por SUNAT. No se puede reenviar." 
        });
      }
    }

    const company = await salesService.getActiveCompany();

    if (!company) {
      return res.status(500).json({ 
        message: "No existe configuración de empresa activa" 
      });
    }

    // Generar JSON del comprobante
    const comprobanteJson = generarComprobanteJson({
      company,
      sale
    });

    // Enviar a APISUNAT
    const respuestaSunat = await sendBill(comprobanteJson);

    // Actualizar o crear documento electrónico
    if (sale.electronicDocument) {
      await actualizarEstadoDocumento({
        saleId: sale.id,
        estado: respuestaSunat.status,
        documentId: respuestaSunat.documentId,
        respuestaSunat,
        observaciones: "Reenvío manual",
        xmlUrl: null,
        cdrUrl: null
      });
    } else {
      const { crearDocumentoElectronico } = require("../services/electronicDocument.service");
      await crearDocumentoElectronico({
        saleId: sale.id,
        tipoComprobante: sale.tipoComprobante,
        serie: sale.serie,
        correlativo: sale.correlativo,
        fileName: comprobanteJson.fileName,
        payloadJson: comprobanteJson
      });
      
      await actualizarEstadoDocumento({
        saleId: sale.id,
        estado: respuestaSunat.status,
        documentId: respuestaSunat.documentId,
        respuestaSunat,
        observaciones: "Reenvío manual",
        xmlUrl: null,
        cdrUrl: null
      });
    }

    res.json({
      ok: true,
      message: "Comprobante reenviado a SUNAT",
      data: {
        documentId: respuestaSunat.documentId,
        status: respuestaSunat.status
      }
    });
  } catch (err) {
    console.error('Error en retrySunat:', err);
    res.status(500).json({
      ok: false,
      message: err.message || "Error al reenviar comprobante a SUNAT"
    });
  }
}

module.exports = {
  list,
  getOne,
  create,
  anular,
  getPdf,
  getSunatStatus,
  getElectronicDocument,
  retrySunat
};