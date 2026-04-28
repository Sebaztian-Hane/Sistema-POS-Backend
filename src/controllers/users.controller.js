const usersService = require("../services/users.service");
const { parsePagination, buildPaginationMeta } = require("../helpers/pagination.helper");

async function list(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const { total, data } = await usersService.list(skip, limit);

    res.json({
      data,
      meta: buildPaginationMeta(total, page, limit),
    });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { username, email, password, roleId, role } = req.body ?? {};

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "username, email y password son obligatorios",
      });
    }

    const user = await usersService.create({ username, email, password, roleId, role });

    res.status(201).json(user);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Email o username ya registrado" });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const { username, email, password, roleId, role } = req.body ?? {};

    const user = await usersService.update(id, { username, email, password, roleId, role });

    res.json(user);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Email o username ya registrado" });
    }
    next(err);
  }
}

async function toggleActive(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const user = await usersService.toggleActive(id);

    res.json(user);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

module.exports = {
  list,
  create,
  update,
  toggleActive,
};
