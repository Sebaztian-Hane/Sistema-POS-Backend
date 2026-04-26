const bcrypt = require("bcryptjs");
const prisma = require("../libs/prisma");
const { parsePagination, buildPaginationMeta } = require("../helpers/pagination.helper");

async function list(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const [total, data] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          username: true,
          email: true,
          roleId: true,
          isActive: true,
          createdAt: true,
          role: { select: { id: true, name: true } },
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

async function create(req, res, next) {
  try {
    const { username, email, password, roleId, role } = req.body ?? {};

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "username, email y password son obligatorios",
      });
    }

    let resolvedRoleId = roleId !== undefined ? parseInt(roleId, 10) : NaN;
    if (!Number.isFinite(resolvedRoleId) && role) {
      const r = await prisma.role.findUnique({
        where: { name: String(role).toUpperCase() },
      });
      if (r) resolvedRoleId = r.id;
    }
    if (!Number.isFinite(resolvedRoleId)) {
      return res.status(400).json({ message: "roleId o role válido es obligatorio" });
    }

    const roleRow = await prisma.role.findUnique({ where: { id: resolvedRoleId } });
    if (!roleRow) {
      return res.status(400).json({ message: "Rol no encontrado" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const user = await prisma.user.create({
      data: {
        username: String(username).trim(),
        email: String(email).trim().toLowerCase(),
        passwordHash,
        roleId: resolvedRoleId,
      },
      select: {
        id: true,
        username: true,
        email: true,
        roleId: true,
        isActive: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(user);
  } catch (err) {
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
    const data = {};

    if (username !== undefined) data.username = String(username).trim();
    if (email !== undefined) data.email = String(email).trim().toLowerCase();
    if (password !== undefined && password !== "") {
      data.passwordHash = await bcrypt.hash(String(password), 10);
    }

    if (roleId !== undefined) {
      const rid = parseInt(roleId, 10);
      if (!Number.isFinite(rid)) {
        return res.status(400).json({ message: "roleId inválido" });
      }
      const roleRow = await prisma.role.findUnique({ where: { id: rid } });
      if (!roleRow) {
        return res.status(400).json({ message: "Rol no encontrado" });
      }
      data.roleId = rid;
    } else if (role !== undefined) {
      const roleRow = await prisma.role.findUnique({
        where: { name: String(role).toUpperCase() },
      });
      if (!roleRow) {
        return res.status(400).json({ message: "Rol no encontrado" });
      }
      data.roleId = roleRow.id;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "No hay campos para actualizar" });
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        roleId: true,
        isActive: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
      },
    });

    res.json(user);
  } catch (err) {
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

    const current = await prisma.user.findUnique({ where: { id } });
    if (!current) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: !current.isActive },
      select: {
        id: true,
        username: true,
        email: true,
        roleId: true,
        isActive: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
      },
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  create,
  update,
  toggleActive,
};
