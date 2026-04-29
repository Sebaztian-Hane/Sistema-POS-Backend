const notificationsService = require("../services/notifications.service");

async function listUnread(req, res, next) {
  try {
    const data = await notificationsService.listUnread();
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

    const notification = await notificationsService.markRead(id);

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
    const result = await notificationsService.markAllRead();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUnread,
  markRead,
  markAllRead,
};
