const prisma = require("../libs/prisma");

async function list(req, res, next) {
  try {
    const data = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, description } = req.body ?? {};
    if (!name) {
      return res.status(400).json({ message: "name es obligatorio" });
    }
    const category = await prisma.category.create({
      data: {
        name: String(name),
        description: description ?? null,
      },
    });
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }
    const { name, description } = req.body ?? {};
    const data = {};
    if (name !== undefined) data.name = String(name);
    if (description !== undefined) data.description = description;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "No hay campos para actualizar" });
    }

    const category = await prisma.category.update({
      where: { id },
      data,
    });
    res.json(category);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      });
      await tx.category.delete({ where: { id } });
    });

    res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }
    next(err);
  }
}

module.exports = {
  list,
  create,
  update,
  remove,
};
