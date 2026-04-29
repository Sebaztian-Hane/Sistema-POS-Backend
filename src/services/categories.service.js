const prisma = require("../libs/prisma");

async function getAll() {
  return await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}

async function create(data) {
  return await prisma.category.create({
    data,
  });
}

async function update(id, data) {
  return await prisma.category.update({
    where: { id },
    data,
  });
}

async function remove(id) {
  return await prisma.$transaction(async (tx) => {
    await tx.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });
    return await tx.category.delete({ where: { id } });
  });
}

module.exports = {
  getAll,
  create,
  update,
  remove,
};
