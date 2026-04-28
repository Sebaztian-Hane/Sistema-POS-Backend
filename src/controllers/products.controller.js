const productsService = require("../services/products.service");
const { parsePagination, buildPaginationMeta } = require("../helpers/pagination.helper");

function parseBool(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return undefined;
}

async function list(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const categoryId = req.query.categoryId
      ? parseInt(String(req.query.categoryId), 10)
      : undefined;
    const name = req.query.name ? String(req.query.name).trim() : "";
    const isActive = parseBool(req.query.isActive);

    const { total, data } = await productsService.list(
      skip,
      limit,
      categoryId,
      name,
      isActive
    );

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
    const product = await productsService.getOne(id);
    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const body = req.body ?? {};
    const {
      sku,
      name,
      description,
      price,
      cost,
      stockCurrent,
      stockMin,
      categoryId,
      coverImageUrl,
      gallery,
      tags,
      isFeatured,
      isActive,
    } = body;

    if (!name || price === undefined || price === null) {
      return res.status(400).json({ message: "name y price son obligatorios" });
    }

    const product = await productsService.create({
      sku: sku ?? null,
      name: String(name),
      description: description ?? null,
      price,
      cost: cost !== undefined && cost !== null ? cost : null,
      stockCurrent: stockCurrent !== undefined ? parseInt(stockCurrent, 10) || 0 : 0,
      stockMin: stockMin !== undefined ? parseInt(stockMin, 10) || 0 : 0,
      categoryId: categoryId !== undefined && categoryId !== null ? parseInt(categoryId, 10) : null,
      coverImageUrl: coverImageUrl ?? null,
      gallery: gallery ?? undefined,
      tags: tags ?? undefined,
      isFeatured: Boolean(isFeatured),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json(product);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "SKU o campo único duplicado" });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const body = req.body ?? {};
    const data = {};

    if (body.sku !== undefined) data.sku = body.sku;
    if (body.name !== undefined) data.name = String(body.name);
    if (body.description !== undefined) data.description = body.description;
    if (body.price !== undefined) data.price = body.price;
    if (body.cost !== undefined) data.cost = body.cost;
    if (body.stockMin !== undefined) data.stockMin = parseInt(body.stockMin, 10) || 0;
    if (body.categoryId !== undefined) {
      data.categoryId =
        body.categoryId === null ? null : parseInt(body.categoryId, 10);
    }
    if (body.coverImageUrl !== undefined) data.coverImageUrl = body.coverImageUrl;
    if (body.gallery !== undefined) data.gallery = body.gallery;
    if (body.tags !== undefined) data.tags = body.tags;
    if (body.isFeatured !== undefined) data.isFeatured = Boolean(body.isFeatured);
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "No hay campos para actualizar" });
    }

    const product = await productsService.update(id, data);

    res.json(product);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    if (err.code === "P2002") {
      return res.status(409).json({ message: "SKU duplicado" });
    }
    next(err);
  }
}

async function softDelete(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const product = await productsService.softDelete(id);

    res.json(product);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    next(err);
  }
}

async function adjustStock(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const delta = parseInt(req.body?.delta ?? req.body?.quantity, 10);
    if (!Number.isFinite(delta) || delta === 0) {
      return res
        .status(400)
        .json({ message: "delta (entero distinto de cero) es obligatorio" });
    }

    const note = req.body?.note ? String(req.body.note) : null;

    const result = await productsService.adjustStock(id, delta, note);

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
  update,
  softDelete,
  adjustStock,
};
