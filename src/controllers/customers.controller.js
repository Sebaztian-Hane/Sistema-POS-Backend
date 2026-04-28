const customersService = require("../services/customers.service");
const { parsePagination, buildPaginationMeta } = require("../helpers/pagination.helper");

const TIPOS = ["DNI", "RUC", "CE", "PASAPORTE", "SIN_DOC"];

async function list(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const { total, data } = await customersService.list(skip, limit);

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
    const customer = await customersService.getOne(id);
    if (!customer) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    res.json(customer);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const body = req.body ?? {};
    const { nombre, tipoDocumento, nroDocumento, email, telefono, direccion } =
      body;

    if (!nombre) {
      return res.status(400).json({ message: "nombre es obligatorio" });
    }

    const tipo =
      tipoDocumento && TIPOS.includes(tipoDocumento)
        ? tipoDocumento
        : "SIN_DOC";

    const customer = await customersService.create({
      nombre: String(nombre),
      tipoDocumento: tipo,
      nroDocumento: nroDocumento ?? null,
      email: email ?? null,
      telefono: telefono ?? null,
      direccion: direccion ?? null,
    });
    res.status(201).json(customer);
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

    const body = req.body ?? {};
    const data = {};

    if (body.nombre !== undefined) data.nombre = String(body.nombre);
    if (body.tipoDocumento !== undefined) {
      if (!TIPOS.includes(body.tipoDocumento)) {
        return res.status(400).json({ message: "tipoDocumento inválido" });
      }
      data.tipoDocumento = body.tipoDocumento;
    }
    if (body.nroDocumento !== undefined) data.nroDocumento = body.nroDocumento;
    if (body.email !== undefined) data.email = body.email;
    if (body.telefono !== undefined) data.telefono = body.telefono;
    if (body.direccion !== undefined) data.direccion = body.direccion;

    const customer = await customersService.update(id, data);
    res.json(customer);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    next(err);
  }
}

async function softDelete(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const customer = await customersService.softDelete(id);
    res.json(customer);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Cliente no encontrado" });
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
};
