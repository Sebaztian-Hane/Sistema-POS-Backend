const bcrypt = require("bcryptjs");
const prisma = require("../libs/prisma");

async function verifyCredentials(email, password) {
  const normalizedEmail = String(email).trim();
  const user = await prisma.user.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: "insensitive" },
    },
    include: { role: true },
  });

  if (!user || !user.isActive) {
    return null;
  }

  const match = await bcrypt.compare(String(password), user.passwordHash);
  if (!match) {
    return null;
  }

  return user;
}

module.exports = {
  verifyCredentials,
};
