const prisma = require("../libs/prisma");

async function listUnread() {
  return await prisma.notification.findMany({
    where: { isRead: false },
    orderBy: { createdAt: "desc" },
  });
}

async function markRead(id) {
  return await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

async function markAllRead() {
  const result = await prisma.notification.updateMany({
    where: { isRead: false },
    data: { isRead: true },
  });
  return { updated: result.count };
}

module.exports = {
  listUnread,
  markRead,
  markAllRead,
};
