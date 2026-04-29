const prisma = require("../libs/prisma");

async function list(skip, limit) {
  const where = { isActive: true };
  const [total, data] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { total, data };
}

async function getOne(id) {
  return await prisma.customer.findUnique({ where: { id } });
}

async function create(data) {
  return await prisma.customer.create({ data });
}

async function update(id, data) {
  return await prisma.customer.update({
    where: { id },
    data,
  });
}

async function softDelete(id) {
  return await prisma.customer.update({
    where: { id },
    data: { isActive: false },
  });
}

module.exports = {
  list,
  getOne,
  create,
  update,
  softDelete,
};
