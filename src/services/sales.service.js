const { Prisma } = require("@prisma/client");
const prisma = require("../libs/prisma");
const { calcularTotalesVenta } = require('../utils/calcularTotalesVenta');
const { generarSerieCorrelativo } = require('../utils/generarSerieCorrelativo');
const { buscarOcrearCliente } = require('./customerLookup.service');
const { generarComprobanteJson } = require('../utils/generarComprobanteJson');
const { crearDocumentoElectronico, actualizarEstadoDocumento } = require('./electronicDocument.service');
const { enviarComprobanteApisunat } = require('./apisunat.service');

function toDecimal(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw Object.assign(new Error("Valor numérico inválido"), { statusCode: 400 });
  }
  return new Prisma.Decimal(n.toFixed(2));
}

function decNum(d) {
  return Number(d);
}

// Helper para redondeo consistente
const roundTo2 = (value) => {
  return Number(Number(value).toFixed(2));
};

async function list(skip, limit, userId, from, to, customerId) {
  const where = {};

  if (userId !== undefined && userId !== null) {
    where.userId = userId;
  }

  if (customerId !== undefined && customerId !== null) {
    where.customerId = parseInt(customerId, 10);
  }

  if (from || to) {
    where.createdAt = {};
    if (from) {
      where.createdAt.gte = from;
    }
    if (to) {
      where.createdAt.lte = to;
    }
  }

  const [total, data] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, username: true, email: true } },
        customer: { select: { id: true, nombre: true, tipoDocumento: true, nroDocumento: true } },
        _count: { select: { items: true, payments: true } },
      },
    }),
  ]);

  return { total, data };
}

async function getOne(id) {
  return await prisma.sale.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      customer: true,
      items: { include: { product: { select: { id: true, upc: true } } } },
      payments: { include: { paymentMethod: true } },
      electronicDocument: true,  // Incluir documento electrónico
    },
  });
}

async function create({ 
  userId, 
  documentoCliente,
  items, 
  payments, 
  extraDescuentoRaw, 
  status,
  tipoComprobante = 'BOLETA'
}) {
  const extraDescuento = toDecimal(extraDescuentoRaw ?? 0);
  if (decNum(extraDescuento) < 0) {
    const e = new Error("descuento no puede ser negativo");
    e.statusCode = 400;
    throw e;
  }

  const saleStatus =
    status && ["COMPLETADA", "ANULADA", "PENDIENTE_PAGO"].includes(status)
      ? status
      : "COMPLETADA";

  // ============================================================
  // PASO 1: RESOLVER CLIENTE (FUERA del transaction)
  // ============================================================
  let customer = null;
  
  if (documentoCliente) {
    customer = await buscarOcrearCliente(documentoCliente);
  }

  // ============================================================
  // PASO 2: VALIDACIÓN CRÍTICA PARA FACTURA
  // ============================================================
  if (tipoComprobante === 'FACTURA') {
    if (!customer) {
      throw Object.assign(
        new Error("Factura requiere cliente con RUC"),
        { statusCode: 400 }
      );
    }
    
    if (customer.tipoDocumento !== 'RUC') {
      throw Object.assign(
        new Error(`Factura requiere RUC. El cliente tiene documento tipo: ${customer.tipoDocumento}`),
        { statusCode: 400 }
      );
    }
    
    if (!customer.nroDocumento || customer.nroDocumento.length !== 11) {
      throw Object.assign(
        new Error(`RUC inválido: ${customer.nroDocumento}. Debe tener 11 dígitos`),
        { statusCode: 400 }
      );
    }
  }

  // ============================================================
  // VALIDACIONES DE ITEMS Y PAGOS
  // ============================================================
  const lineInputs = items.map((it) => ({
    productId: parseInt(it.productId, 10),
    quantity: parseInt(it.quantity, 10),
    descuento: toDecimal(it.descuento ?? 0),
  }));

  const productIdsCheck = lineInputs.map((l) => l.productId);
  if (new Set(productIdsCheck).size !== productIdsCheck.length) {
    const e = new Error("No se puede repetir el mismo productId en una misma venta");
    e.statusCode = 400;
    throw e;
  }

  for (const line of lineInputs) {
    if (!Number.isFinite(line.productId) || line.productId <= 0) {
      const e = new Error("productId inválido en items");
      e.statusCode = 400;
      throw e;
    }
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      const e = new Error("quantity inválida en items");
      e.statusCode = 400;
      throw e;
    }
    if (decNum(line.descuento) < 0) {
      const e = new Error("descuento de ítem no puede ser negativo");
      e.statusCode = 400;
      throw e;
    }
  }

  const paymentInputs = payments.map((p) => ({
    paymentMethodId: parseInt(p.paymentMethodId, 10),
    amount: toDecimal(p.amount),
  }));

  for (const p of paymentInputs) {
    if (!Number.isFinite(p.paymentMethodId) || p.paymentMethodId <= 0) {
      const e = new Error("paymentMethodId inválido en payments");
      e.statusCode = 400;
      throw e;
    }
    if (decNum(p.amount) <= 0) {
      const e = new Error("amount debe ser mayor a 0");
      e.statusCode = 400;
      throw e;
    }
  }

  // ============================================================
  // OBTENER DATOS DE LA EMPRESA (FUERA del transaction)
  // ============================================================
  const company = await prisma.company.findFirst({
    where: { isActive: true }
  });
  
  if (!company) {
    throw Object.assign(
      new Error("No existe configuración de empresa activa. Contacte al administrador."),
      { statusCode: 500 }
    );
  }
  // ============================================================
  // TRANSACTION
  // ============================================================
  return await prisma.$transaction(async (tx) => {
    // Obtener productos
    const productIds = [...new Set(lineInputs.map((l) => l.productId))];
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    if (products.length !== productIds.length) {
      throw Object.assign(new Error("Uno o más productos no existen o están inactivos"), { statusCode: 400 });
    }

    // Validar stock y disponibilidad de seriales
    if (saleStatus === "COMPLETADA" || saleStatus === "PENDIENTE_PAGO") {
      for (const line of items) {
        const p = byId.get(parseInt(line.productId, 10));
        if (p.stockCurrent < parseInt(line.quantity, 10)) {
          throw Object.assign(new Error(`Stock insuficiente para "${p.name}"`), { statusCode: 400 });
        }
        
        if (p.isSerialized) {
          const serialNumbers = line.serialNumbers || [];
          if (serialNumbers.length !== parseInt(line.quantity, 10)) {
            throw Object.assign(
              new Error(`Debe proporcionar exactamente ${line.quantity} números de serie para "${p.name}"`),
              { statusCode: 400 }
            );
          }
          
          for (const sn of serialNumbers) {
            const productItem = await tx.productItem.findUnique({ where: { serialNumber: sn } });
            if (!productItem || productItem.productId !== p.id || productItem.status !== "DISPONIBLE") {
              throw Object.assign(new Error(`El serial "${sn}" no está disponible`), { statusCode: 400 });
            }
          }
        }
      }
    }

    // ============================================================
    // PASO 3: CALCULAR TOTALES
    // ============================================================
    const descuentoExtraPorItem = Number(
      (
        Number(extraDescuentoRaw || 0) / items.length
      ).toFixed(2)
    );

    const itemsParaCalculo = items.map((item) => {
      const p = byId.get(parseInt(item.productId, 10));
      const descuentoItem = Number(item.descuento ?? 0);
      const descuentoTotalItem = roundTo2(descuentoItem + descuentoExtraPorItem);
      
      return {
        productId: parseInt(item.productId, 10),
        nombreSnapshot: p.name,
        precio: Number(p.price),
        quantity: parseInt(item.quantity, 10),
        descuento: descuentoTotalItem,
      };
    });

    const totalesCalculados = calcularTotalesVenta(itemsParaCalculo);

    // Validar y ajustar descuento extra
    const sumaDescuentosItems = items.reduce((acc, item) => acc + Number(item.descuento || 0), 0);
    const extraDescuentoAplicado = roundTo2(totalesCalculados.descuento - sumaDescuentosItems);
    const extraDescuentoEsperado = roundTo2(Number(extraDescuentoRaw || 0));
    
    let totalFinal = totalesCalculados.total;
    if (Math.abs(extraDescuentoAplicado - extraDescuentoEsperado) > 0.02) {
      console.warn(`Diferencia en descuento extra: esperado ${extraDescuentoEsperado}, aplicado ${extraDescuentoAplicado}`);
      
      const diferencia = roundTo2(extraDescuentoEsperado - extraDescuentoAplicado);
      if (Math.abs(diferencia) <= 0.02) {
        totalFinal = roundTo2(totalesCalculados.total + diferencia);
      }
    }

    // Validar pagos
    const paySum = paymentInputs.reduce((acc, p) => acc.add(p.amount), new Prisma.Decimal(0));
    const diferenciaPagos = Math.abs(decNum(paySum) - totalFinal);
    
    if (diferenciaPagos > 0.02) {
      throw Object.assign(
        new Error(`La suma de pagos (${decNum(paySum)}) no coincide con el total (${totalFinal}). Diferencia: ${diferenciaPagos}`), 
        { statusCode: 400 }
      );
    }
    
    let totalParaGuardar = totalFinal;
    if (diferenciaPagos > 0 && diferenciaPagos <= 0.02) {
      totalParaGuardar = decNum(paySum);
    }

    // ============================================================
    // PASO 4: GENERAR SERIE Y CORRELATIVO
    // ============================================================
    const { serie, correlativo } = await generarSerieCorrelativo({
      tx,
      tipoComprobante
    });

    // ============================================================
    // PASO 5: CREAR LA VENTA
    // ============================================================
    const fechaEmision = new Date();
    
    const created = await tx.sale.create({
      data: {
        userId,
        customerId: customer?.id || null,
        tipoComprobante,
        serie,
        correlativo,
        fechaEmision,
        subtotal: toDecimal(totalesCalculados.subtotal),
        igv: toDecimal(totalesCalculados.igv),
        total: toDecimal(totalParaGuardar),
        descuento: toDecimal(totalesCalculados.descuento),
        currency: 'PEN',
        status: saleStatus,
        payments: {
          create: paymentInputs.map((p) => ({
            paymentMethodId: p.paymentMethodId,
            amount: p.amount,
          })),
        },
      },
    });

    // ============================================================
    // PASO 6: CREAR LOS SALEITEMS
    // ============================================================
    const saleItemsToCreate = totalesCalculados.itemsCalculados.map((itemCalculado) => {
      const originalItem = items.find(i => parseInt(i.productId, 10) === itemCalculado.productId);
      const product = byId.get(itemCalculado.productId);
      
      const dbData = {
        saleId: created.id,
        productId: itemCalculado.productId,
        nombreSnapshot: itemCalculado.nombreSnapshot,
        precioSnapshot: toDecimal(itemCalculado.precioSnapshot),
        valorUnitario: toDecimal(itemCalculado.valorUnitario),
        quantity: itemCalculado.quantity,
        descuento: toDecimal(itemCalculado.descuento),
        subtotal: toDecimal(itemCalculado.subtotal),
        igv: toDecimal(itemCalculado.igv),
        total: toDecimal(itemCalculado.total),
      };
      
      const metadata = {
        serialNumbers: product?.isSerialized && originalItem?.serialNumbers 
          ? originalItem.serialNumbers 
          : [],
        isSerialized: product?.isSerialized || false,
        productName: product?.name
      };
      
      return { dbData, metadata };
    });

    const createdItems = [];
    for (const itemData of saleItemsToCreate) {
      const saleItem = await tx.saleItem.create({
        data: itemData.dbData,
      });
      
      createdItems.push({
        ...saleItem,
        metadata: itemData.metadata
      });
    }

    // ============================================================
    // PASO 7: PROCESAR STOCK Y SERIALES
    // ============================================================
    if (saleStatus === "COMPLETADA") {
      for (const saleItemWithMeta of createdItems) {
        const product = byId.get(saleItemWithMeta.productId);
        
        if (saleItemWithMeta.metadata.isSerialized && saleItemWithMeta.metadata.serialNumbers.length > 0) {
          for (const sn of saleItemWithMeta.metadata.serialNumbers) {
            await tx.productItem.update({
              where: { serialNumber: sn },
              data: { status: "VENDIDO", saleItemId: saleItemWithMeta.id },
            });
          }
        }
        
        await tx.product.update({
          where: { id: saleItemWithMeta.productId },
          data: { stockCurrent: { decrement: saleItemWithMeta.quantity } },
        });
        
        await tx.stockMovement.create({
          data: {
            productId: saleItemWithMeta.productId,
            type: "VENTA",
            quantity: saleItemWithMeta.quantity,
            referenceId: created.id,
          },
        });
        
        const fresh = await tx.product.findUnique({ where: { id: saleItemWithMeta.productId } });
        if (fresh && fresh.stockCurrent < fresh.stockMin) {
          await tx.notification.create({
            data: {
              type: "STOCK_MINIMO",
              message: `Stock mínimo alcanzado: ${fresh.name} (${fresh.stockCurrent} unidades)`,
              referenceId: fresh.id,
              isRead: false,
            },
          });
        }
      }
    }

    // ============================================================
    // PASO 8: GENERAR Y ENVIAR COMPROBANTE ELECTRÓNICO
    // SOLO si la venta está COMPLETADA
    // ============================================================
    let electronicDocumentResult = null;
    
    if (saleStatus === "COMPLETADA") {
      try {
        // Obtener la venta completa con sus relaciones
        const saleCompleta = await tx.sale.findUnique({
          where: { id: created.id },
          include: {
            customer: true,
            items: true,
          }
        });
        
        // 8.1: Generar JSON del comprobante
        const comprobanteJson = generarComprobanteJson({
          company,
          sale: saleCompleta
        });
        
        // 8.2: Crear registro del documento electrónico
        await crearDocumentoElectronico({
          saleId: created.id,
          tipoComprobante,
          serie,
          correlativo,
          payloadJson: comprobanteJson
        });
        
        // 8.3: Enviar a API SUNAT
        const respuestaSunat = await enviarComprobanteApisunat(comprobanteJson);
        
        // 8.4: Actualizar estado del documento
        electronicDocumentResult = await actualizarEstadoDocumento({
          saleId: created.id,
          estado: respuestaSunat.success ? 'ACEPTADO' : 'RECHAZADO',
          respuestaSunat,
          observaciones: respuestaSunat.message || respuestaSunat.cdrDescription,
          codigoHash: respuestaSunat.hash,
          codigoCdr: respuestaSunat.cdrCode
        });
        
        console.log(`Comprobante ${serie}-${correlativo} enviado a SUNAT. Estado: ${respuestaSunat.success ? 'ACEPTADO' : 'RECHAZADO'}`);
        
      } catch (error) {
        console.error('Error al enviar comprobante a SUNAT:', error);
        
        // Registrar el error en el documento electrónico
        await actualizarEstadoDocumento({
          saleId: created.id,
          estado: 'ERROR',
          respuestaSunat: null,
          observaciones: error.message,
          codigoHash: null,
          codigoCdr: null
        });
        
        // No lanzamos error para no afectar la creación de la venta
        // pero registramos el problema
      }
    }

    // ============================================================
    // RETORNAR LA VENTA COMPLETA
    // ============================================================
    const finalSale = await tx.sale.findUnique({
      where: { id: created.id },
      include: {
        customer: true,
        items: true,
        payments: {
          include: {
            paymentMethod: true
          }
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        electronicDocument: true  // Incluir info del documento electrónico
      }
    });

    return finalSale;
  });
}

async function anular(id) {
  return await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id },
      include: { 
        items: { include: { productItem: true } },
        electronicDocument: true
      },
    });

    if (!sale || sale.status === "ANULADA") {
      throw Object.assign(new Error("Venta no encontrada o ya anulada"), { statusCode: 400 });
    }

    if (sale.status === "COMPLETADA") {
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockCurrent: { increment: item.quantity } },
        });

        if (item.productItem) {
          await tx.productItem.update({
            where: { id: item.productItem.id },
            data: { status: "DISPONIBLE", saleItemId: null },
          });
        }

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "DEVOLUCION",
            quantity: item.quantity,
            referenceId: sale.id,
            note: "Anulación de venta",
          },
        });
      }
      
      // TODO: Enviar anulación a SUNAT si el comprobante fue aceptado
      if (sale.electronicDocument && sale.electronicDocument.sunatStatus === 'ACEPTADO') {
        // Aquí iría la lógica para enviar la anulación a SUNAT
        console.log(`Pendiente: Enviar anulación del comprobante ${sale.serie}-${sale.correlativo} a SUNAT`);
      }
    }

    const updated = await tx.sale.update({
      where: { id },
      data: { status: "ANULADA" },
      include: { items: true, customer: true, user: true },
    });

    await tx.notification.create({
      data: {
        type: "VENTA_ANULADA",
        message: `Venta #${sale.id} anulada`,
        referenceId: sale.id,
        isRead: false,
      },
    });

    return updated;
  });
}

module.exports = {
  list,
  getOne,
  create,
  anular,
};