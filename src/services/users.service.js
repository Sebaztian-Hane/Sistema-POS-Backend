const bcrypt = require("bcryptjs");
const prisma = require("../libs/prisma");

async function list(skip, limit) {
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

  return { total, data };
}

async function create(data) {
  let resolvedRoleId = data.roleId !== undefined ? parseInt(data.roleId, 10) : NaN;
  if (!Number.isFinite(resolvedRoleId) && data.role) {
    const r = await prisma.role.findUnique({
      where: { name: String(data.role).toUpperCase() },
    });
    if (r) resolvedRoleId = r.id;
  }
  if (!Number.isFinite(resolvedRoleId)) {
    const e = new Error("roleId o role válido es obligatorio");
    e.statusCode = 400;
    throw e;
  }

  const roleRow = await prisma.role.findUnique({ where: { id: resolvedRoleId } });
  if (!roleRow) {
    const e = new Error("Rol no encontrado");
    e.statusCode = 400;
    throw e;
  }

  const passwordHash = await bcrypt.hash(String(data.password), 10);

  return await prisma.user.create({
    data: {
      username: String(data.username).trim(),
      email: String(data.email).trim().toLowerCase(),
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
}

async function update(id, inputData) {
  const dataToUpdate = {};

  if (inputData.username !== undefined) dataToUpdate.username = String(inputData.username).trim();
  if (inputData.email !== undefined) dataToUpdate.email = String(inputData.email).trim().toLowerCase();
  if (inputData.password !== undefined && inputData.password !== "") {
    dataToUpdate.passwordHash = await bcrypt.hash(String(inputData.password), 10);
  }

  if (inputData.roleId !== undefined) {
    const rid = parseInt(inputData.roleId, 10);
    if (!Number.isFinite(rid)) {
      const e = new Error("roleId inválido");
      e.statusCode = 400;
      throw e;
    }
    const roleRow = await prisma.role.findUnique({ where: { id: rid } });
    if (!roleRow) {
      const e = new Error("Rol no encontrado");
      e.statusCode = 400;
      throw e;
    }
    dataToUpdate.roleId = rid;
  } else if (inputData.role !== undefined) {
    const roleRow = await prisma.role.findUnique({
      where: { name: String(inputData.role).toUpperCase() },
    });
    if (!roleRow) {
      const e = new Error("Rol no encontrado");
      e.statusCode = 400;
      throw e;
    }
    dataToUpdate.roleId = roleRow.id;
  }

  if (Object.keys(dataToUpdate).length === 0) {
    const e = new Error("No hay campos para actualizar");
    e.statusCode = 400;
    throw e;
  }

  return await prisma.user.update({
    where: { id },
    data: dataToUpdate,
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
}

async function toggleActive(id) {
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) {
    const e = new Error("Usuario no encontrado");
    e.statusCode = 404;
    throw e;
  }

  return await prisma.user.update({
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
}

module.exports = {
  list,
  create,
  update,
  toggleActive,
};
