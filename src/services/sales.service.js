const { Prisma } = require("@prisma/client");
const prisma = require("../libs/prisma");

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
        customer: { select: { id: true, nombre: true } },
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
    },
  });
}

async function create({ userId, customerId, items, payments, extraDescuentoRaw, status }) {
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

  return await prisma.$transaction(async (tx) => {
    if (customerId !== null) {
      const c = await tx.customer.findFirst({
        where: { id: customerId, isActive: true },
      });
      if (!c) {
        throw Object.assign(new Error("Cliente no encontrado o inactivo"), { statusCode: 404 });
      }
    }

    const productIds = [...new Set(lineInputs.map((l) => l.productId))];
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    if (products.length !== productIds.length) {
      throw Object.assign(new Error("Uno o más productos no existen o están inactivos"), { statusCode: 400 });
    }

    let subtotalGross = new Prisma.Decimal(0);
    let sumLineDesc = new Prisma.Decimal(0);
    const saleItemsData = [];

    for (const line of items) {
      const productId = parseInt(line.productId, 10);
      const p = byId.get(productId);
      const price = p.price;
      const quantity = parseInt(line.quantity, 10);
      const descuentoTotal = toDecimal(line.descuento ?? 0);

      if (p.isSerialized) {
        // Validación para productos serializados
        const serials = line.serialNumbers || [];
        if (serials.length !== quantity) {
          throw Object.assign(
            new Error(`Debe proporcionar exactamente ${quantity} números de serie para "${p.name}"`),
            { statusCode: 400 }
          );
        }

        // Para productos serializados, creamos un SaleItem por cada unidad (por la relación 1-1 del esquema)
        const descPerUnit = descuentoTotal.div(quantity);
        for (const sn of serials) {
          const itemSubtotal = price.sub(descPerUnit);
          subtotalGross = subtotalGross.add(price);
          sumLineDesc = sumLineDesc.add(descPerUnit);

          saleItemsData.push({
            productId,
            nombreSnapshot: p.name,
            precioSnapshot: price,
            quantity: 1,
            descuento: descPerUnit,
            subtotal: itemSubtotal,
            serialNumber: sn, // Campo temporal para procesar después
          });
        }
      } else {
        // Producto normal
        const lineGross = price.mul(quantity);
        const lineSubtotal = lineGross.sub(descuentoTotal);
        if (decNum(lineSubtotal) < 0) {
          throw Object.assign(new Error(`El descuento del ítem "${p.name}" supera el subtotal`), { statusCode: 400 });
        }

        subtotalGross = subtotalGross.add(lineGross);
        sumLineDesc = sumLineDesc.add(descuentoTotal);

        saleItemsData.push({
          productId,
          nombreSnapshot: p.name,
          precioSnapshot: price,
          quantity,
          descuento: descuentoTotal,
          subtotal: lineSubtotal,
        });
      }
    }

    const total = subtotalGross.sub(sumLineDesc).sub(extraDescuento);
    if (decNum(total) < 0) {
      throw Object.assign(new Error("El total de la venta no puede ser negativo"), { statusCode: 400 });
    }

    // Validar pagos
    const paySum = paymentInputs.reduce((acc, p) => acc.add(p.amount), new Prisma.Decimal(0));
    if (Math.abs(decNum(paySum) - decNum(total)) > 0.02) {
      throw Object.assign(new Error("La suma de pagos no coincide con el total"), { statusCode: 400 });
    }

    // Validar stock y disponibilidad de seriales
    if (saleStatus === "COMPLETADA" || saleStatus === "PENDIENTE_PAGO") {
      for (const line of items) {
        const p = byId.get(parseInt(line.productId, 10));
        if (p.stockCurrent < parseInt(line.quantity, 10)) {
          throw Object.assign(new Error(`Stock insuficiente para "${p.name}"`), { statusCode: 400 });
        }
        
        if (p.isSerialized) {
          for (const sn of line.serialNumbers) {
            const item = await tx.productItem.findUnique({ where: { serialNumber: sn } });
            if (!item || item.productId !== p.id || item.status !== "DISPONIBLE") {
              throw Object.assign(new Error(`El serial "${sn}" no está disponible`), { statusCode: 400 });
            }
          }
        }
      }
    }

    // Crear la venta
    const created = await tx.sale.create({
      data: {
        userId,
        customerId,
        subtotal: subtotalGross,
        descuento: sumLineDesc.add(extraDescuento),
        total,
        status: saleStatus,
        payments: {
          create: paymentInputs.map((p) => ({
            paymentMethodId: p.paymentMethodId,
            amount: p.amount,
          })),
        },
        items: {
          create: saleItemsData.map(({ serialNumber, ...rest }) => rest),
        },
      },
      include: { items: true },
    });

    if (saleStatus === "COMPLETADA") {
      // Procesar cada SaleItem creado
      for (const saleItem of created.items) {
        // Encontrar el serialNumber original para este SaleItem si era serializado
        const originalData = saleItemsData.find(
          (d) =>
            d.productId === saleItem.productId &&
            d.subtotal.equals(saleItem.subtotal) &&
            d.serialNumber // Buscamos uno que tenga serialNumber
        );

        if (originalData && originalData.serialNumber) {
          // Actualizar ProductItem
          await tx.productItem.update({
            where: { serialNumber: originalData.serialNumber },
            data: { status: "VENDIDO", saleItemId: saleItem.id },
          });
          // Eliminar de saleItemsData para no re-usarlo si hay varios iguales
          const idx = saleItemsData.indexOf(originalData);
          saleItemsData.splice(idx, 1);
        }

        // Actualizar Stock y Movimiento
        await tx.product.update({
          where: { id: saleItem.productId },
          data: { stockCurrent: { decrement: saleItem.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: saleItem.productId,
            type: "VENTA",
            quantity: saleItem.quantity,
            referenceId: created.id,
          },
        });

        // Notificación de Stock Mínimo
        const fresh = await tx.product.findUnique({ where: { id: saleItem.productId } });
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

    return created;
  });
}

async function anular(id) {
  return await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id },
      include: { items: { include: { productItem: true } } },
    });

    if (!sale || sale.status === "ANULADA") {
      throw Object.assign(new Error("Venta no encontrada o ya anulada"), { statusCode: 400 });
    }

    if (sale.status === "COMPLETADA") {
      for (const item of sale.items) {
        // Devolver stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stockCurrent: { increment: item.quantity } },
        });

        // Si tenía un item serializado, liberarlo
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
