const prisma = require("../libs/prisma");

async function listUnread(req, res, next) {
  try {
    const data = await prisma.notification.findMany({
      where: { isRead: false },
      orderBy: { createdAt: "desc" },
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json(notification);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Notificación no encontrada" });
    }
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    const result = await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    res.json({ updated: result.count });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUnread,
  markRead,
  markAllRead,
};
