const { Prisma } = require("@prisma/client");
const prisma = require("../libs/prisma");

function toDecimal(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return new Prisma.Decimal(fallback.toFixed(2));
  }
  return new Prisma.Decimal(n.toFixed(2));
}

async function list(skip, limit, categoryId, name, isActive) {
  const where = {};
  if (Number.isFinite(categoryId)) {
    where.categoryId = categoryId;
  }
  if (name) {
    where.name = { contains: name, mode: "insensitive" };
  }
  if (typeof isActive === "boolean") {
    where.isActive = isActive;
  }

  const [total, data] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { order: "asc" } },
      },
    }),
  ]);

  return { total, data };
}

async function getOne(id) {
  return await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      images: { orderBy: { order: "asc" } },
    },
  });
}

async function create(data) {
  const mappedData = { ...data };
  if (mappedData.price !== undefined) mappedData.price = toDecimal(mappedData.price);
  if (mappedData.cost !== undefined && mappedData.cost !== null) mappedData.cost = toDecimal(mappedData.cost);

  return await prisma.product.create({
    data: mappedData,
    include: {
      category: true,
      images: true,
    },
  });
}

async function update(id, data) {
  const mappedData = { ...data };
  if (mappedData.price !== undefined) mappedData.price = toDecimal(mappedData.price);
  if (mappedData.cost !== undefined) mappedData.cost = mappedData.cost === null ? null : toDecimal(mappedData.cost);

  return await prisma.product.update({
    where: { id },
    data: mappedData,
    include: { category: true, images: true },
  });
}

async function softDelete(id) {
  return await prisma.product.update({
    where: { id },
    data: { isActive: false },
    include: { category: true, images: true },
  });
}

async function adjustStock(id, delta, note) {
  return await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id } });
    if (!product) {
      const e = new Error("Producto no encontrado");
      e.statusCode = 404;
      throw e;
    }

    const nextStock = product.stockCurrent + delta;
    if (nextStock < 0) {
      const e = new Error("El ajuste dejaría el stock negativo");
      e.statusCode = 400;
      throw e;
    }

    const updated = await tx.product.update({
      where: { id },
      data: { stockCurrent: nextStock },
      include: { category: true, images: true },
    });

    await tx.stockMovement.create({
      data: {
        productId: id,
        type: "AJUSTE",
        quantity: delta,
        referenceId: null,
        note,
      },
    });

    return updated;
  });
}

module.exports = {
  list,
  getOne,
  create,
  update,
  softDelete,
  adjustStock,
};
