const salesService = require("../services/sales.service");
const { parsePagination, buildPaginationMeta } = require("../helpers/pagination.helper");

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

    // Validar que tipoComprobante sea válido
    const tiposPermitidos = ['FACTURA', 'BOLETA'];
    if (!tiposPermitidos.includes(tipoComprobante)) {
      return res.status(400).json({ 
        message: "tipoComprobante debe ser 'FACTURA' o 'BOLETA'" 
      });
    }

    // ============================================================
    // VALIDACIÓN #2: FACTURA REQUIERE RUC (CRÍTICO PARA SUNAT)
    // ============================================================
    if (tipoComprobante === 'FACTURA') {
      // Factura debe tener documento
      if (!documentoCliente) {
        return res.status(400).json({
          message: "Factura requiere RUC del cliente"
        });
      }
      
      // Factura requiere RUC (11 dígitos)
      const docLimpio = String(documentoCliente).trim();
      if (docLimpio.length !== 11) {
        return res.status(400).json({
          message: "Factura requiere RUC válido de 11 dígitos"
        });
      }
      
      // Validar que sea solo números
      if (!/^\d+$/.test(docLimpio)) {
        return res.status(400).json({
          message: "RUC debe contener solo números"
        });
      }
    }

    // ============================================================
    // VALIDACIÓN #3: BOLETA - DOCUMENTO ES OPCIONAL (válido)
    // ============================================================
    // Si es BOLETA y tiene documento, validar formato
    if (tipoComprobante === 'BOLETA' && documentoCliente) {
      const docLimpio = String(documentoCliente).trim();
      // Puede ser DNI (8 dígitos) o RUC (11 dígitos)
      if (docLimpio.length !== 8 && docLimpio.length !== 11) {
        return res.status(400).json({
          message: "documentoCliente para BOLETA debe ser DNI (8 dígitos) o RUC (11 dígitos)"
        });
      }
      
      // Validar que sea solo números
      if (!/^\d+$/.test(docLimpio)) {
        return res.status(400).json({
          message: "Documento debe contener solo números"
        });
      }
    }

    // Validar items
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items debe ser un array no vacío" });
    }
    
    // Validar payments
    if (!Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ message: "payments debe ser un array no vacío" });
    }

    const userId = req.user.id;

    // Crear la venta
    const sale = await salesService.create({
      userId,
      documentoCliente,
      tipoComprobante,
      items,
      payments,
      extraDescuentoRaw,
      status,
    });

    // Respuesta exitosa
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
        ...sale
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

    const result = await salesService.anular(id);

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

module.exports = {
  list,
  getOne,
  create,
  anular,
};