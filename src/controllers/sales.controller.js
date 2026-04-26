const { Prisma } = require("@prisma/client");
const prisma = require("../libs/prisma");
const { parsePagination, buildPaginationMeta } = require("../helpers/pagination.helper");

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

async function list(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const where = {};

    if (req.query.userId !== undefined && req.query.userId !== "") {
      const uid = parseInt(String(req.query.userId), 10);
      if (Number.isFinite(uid)) {
        where.userId = uid;
      }
    }

    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) {
        const from = new Date(String(req.query.from));
        if (!Number.isNaN(from.getTime())) {
          where.createdAt.gte = from;
        }
      }
      if (req.query.to) {
        const to = new Date(String(req.query.to));
        if (!Number.isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          where.createdAt.lte = to;
        }
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
          user: {
            select: { id: true, username: true, email: true },
          },
          customer: {
            select: { id: true, nombre: true },
          },
          _count: { select: { items: true, payments: true } },
        },
      }),
    ]);

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

    const sale = await prisma.sale.findUnique({
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
        items: { include: { product: { select: { id: true, sku: true } } } },
        payments: { include: { paymentMethod: true } },
      },
    });

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
    const { customerId, items, payments, descuento: extraDescuentoRaw, status } =
      body;

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

    const extraDescuento = toDecimal(extraDescuentoRaw ?? 0);
    if (decNum(extraDescuento) < 0) {
      return res.status(400).json({ message: "descuento no puede ser negativo" });
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
      return res.status(400).json({
        message: "No se puede repetir el mismo productId en una misma venta",
      });
    }

    for (const line of lineInputs) {
      if (!Number.isFinite(line.productId) || line.productId <= 0) {
        return res.status(400).json({ message: "productId inválido en items" });
      }
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        return res.status(400).json({ message: "quantity inválida en items" });
      }
      if (decNum(line.descuento) < 0) {
        return res.status(400).json({ message: "descuento de ítem no puede ser negativo" });
      }
    }

    const paymentInputs = payments.map((p) => ({
      paymentMethodId: parseInt(p.paymentMethodId, 10),
      amount: toDecimal(p.amount),
    }));

    for (const p of paymentInputs) {
      if (!Number.isFinite(p.paymentMethodId) || p.paymentMethodId <= 0) {
        return res
          .status(400)
          .json({ message: "paymentMethodId inválido en payments" });
      }
      if (decNum(p.amount) <= 0) {
        return res.status(400).json({ message: "amount debe ser mayor a 0" });
      }
    }

    const sale = await prisma.$transaction(async (tx) => {
      if (customerIdParsed !== null) {
        const c = await tx.customer.findFirst({
          where: { id: customerIdParsed, isActive: true },
        });
        if (!c) {
          const e = new Error("Cliente no encontrado o inactivo");
          e.statusCode = 404;
          throw e;
        }
      }

      const productIds = [...new Set(lineInputs.map((l) => l.productId))];
      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
          isActive: true,
        },
      });
      const byId = new Map(products.map((p) => [p.id, p]));
      if (products.length !== productIds.length) {
        const e = new Error("Uno o más productos no existen o están inactivos");
        e.statusCode = 400;
        throw e;
      }

      let subtotalGross = new Prisma.Decimal(0);
      let sumLineDesc = new Prisma.Decimal(0);
      const builtLines = [];

      for (const line of lineInputs) {
        const p = byId.get(line.productId);
        const price = p.price;
        const lineGross = price.mul(line.quantity);
        subtotalGross = subtotalGross.add(lineGross);
        sumLineDesc = sumLineDesc.add(line.descuento);
        const lineSubtotal = lineGross.sub(line.descuento);
        if (decNum(lineSubtotal) < 0) {
          const e = new Error("El descuento del ítem supera el subtotal bruto");
          e.statusCode = 400;
          throw e;
        }
        builtLines.push({
          productId: line.productId,
          nombreSnapshot: p.name,
          precioSnapshot: price,
          quantity: line.quantity,
          descuento: line.descuento,
          subtotal: lineSubtotal,
        });
      }

      const saleDescuento = sumLineDesc.add(extraDescuento);
      const sumLineSubtotals = builtLines.reduce(
        (acc, l) => acc.add(l.subtotal),
        new Prisma.Decimal(0),
      );
      const total = sumLineSubtotals.sub(extraDescuento);

      if (decNum(total) < 0) {
        const e = new Error("El total de la venta no puede ser negativo");
        e.statusCode = 400;
        throw e;
      }

      const paySum = paymentInputs.reduce(
        (acc, p) => acc.add(p.amount),
        new Prisma.Decimal(0),
      );
      const diff = Math.abs(decNum(paySum) - decNum(total));
      if (diff > 0.02) {
        const e = new Error(
          "La suma de pagos debe coincidir con el total de la venta",
        );
        e.statusCode = 400;
        throw e;
      }

      for (const pm of paymentInputs) {
        const method = await tx.paymentMethod.findFirst({
          where: { id: pm.paymentMethodId, isActive: true },
        });
        if (!method) {
          const e = new Error("Método de pago no encontrado o inactivo");
          e.statusCode = 400;
          throw e;
        }
      }

      if (saleStatus === "COMPLETADA" || saleStatus === "PENDIENTE_PAGO") {
        for (const line of lineInputs) {
          const p = byId.get(line.productId);
          if (p.stockCurrent < line.quantity) {
            const e = new Error(
              `Stock insuficiente para el producto "${p.name}"`,
            );
            e.statusCode = 400;
            throw e;
          }
        }
      }

      const created = await tx.sale.create({
        data: {
          userId,
          customerId: customerIdParsed,
          subtotal: subtotalGross,
          descuento: saleDescuento,
          total,
          status: saleStatus,
          items: {
            create: builtLines.map((l) => ({
              productId: l.productId,
              nombreSnapshot: l.nombreSnapshot,
              precioSnapshot: l.precioSnapshot,
              quantity: l.quantity,
              descuento: l.descuento,
              subtotal: l.subtotal,
            })),
          },
          payments: {
            create: paymentInputs.map((p) => ({
              paymentMethodId: p.paymentMethodId,
              amount: p.amount,
            })),
          },
        },
        include: {
          items: true,
          payments: { include: { paymentMethod: true } },
          customer: true,
          user: {
            select: { id: true, username: true, email: true },
          },
        },
      });

      if (saleStatus === "COMPLETADA") {
        for (const line of lineInputs) {
          const updated = await tx.product.updateMany({
            where: {
              id: line.productId,
              stockCurrent: { gte: line.quantity },
            },
            data: { stockCurrent: { decrement: line.quantity } },
          });
          if (updated.count === 0) {
            const e = new Error("No se pudo actualizar el stock");
            e.statusCode = 409;
            throw e;
          }

          await tx.stockMovement.create({
            data: {
              productId: line.productId,
              type: "VENTA",
              quantity: line.quantity,
              referenceId: created.id,
              note: null,
            },
          });
        }

        for (const line of lineInputs) {
          const fresh = await tx.product.findUnique({
            where: { id: line.productId },
          });
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

    res.status(201).json(sale);
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

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!sale) {
        const e = new Error("Venta no encontrada");
        e.statusCode = 404;
        throw e;
      }

      if (sale.status === "ANULADA") {
        const e = new Error("La venta ya está anulada");
        e.statusCode = 400;
        throw e;
      }

      if (sale.status === "COMPLETADA") {
        for (const item of sale.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockCurrent: { increment: item.quantity } },
          });

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
        include: {
          items: true,
          payments: { include: { paymentMethod: true } },
          customer: true,
          user: {
            select: { id: true, username: true, email: true },
          },
        },
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

    res.json(result);
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
