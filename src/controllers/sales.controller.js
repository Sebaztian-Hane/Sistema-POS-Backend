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
    
    // PRIORIDAD MÁXIMA: tipoComprobante es OBLIGATORIO ahora
    const { 
      customerId, 
      tipoComprobante,  // NUEVO: 'FACTURA' o 'BOLETA'
      items, 
      payments, 
      descuento: extraDescuentoRaw, 
      status 
    } = body;

    // Validación CRÍTICA para SUNAT
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

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items debe ser un array no vacío" });
    }
    if (!Array.isArray(payments) || payments.length === 0) {
      return res
        .status(400)
        .json({ message: "payments debe ser un array no vacío" });
    }

    const userId = req.user.id;
    const customerIdParsed =
      customerId === undefined || customerId === null
        ? null
        : parseInt(customerId, 10);
    if (customerIdParsed !== null && !Number.isFinite(customerIdParsed)) {
      return res.status(400).json({ message: "customerId inválido" });
    }

    // CRÍTICO: Enviar tipoComprobante al servicio
    const sale = await salesService.create({
      userId,
      customerId: customerIdParsed,
      tipoComprobante,  // ENVIAR OBLIGATORIAMENTE
      items,
      payments,
      extraDescuentoRaw,
      status,
    });

    // Respuesta mejorada con información tributaria
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