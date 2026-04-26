const bcrypt = require("bcryptjs");
const prisma = require("../libs/prisma");
const { generateToken } = require("../helpers/jwt.helper");

async function login(req, res, next) {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({
        message: "Correo y contraseña son obligatorios",
      });
    }

    const normalizedEmail = String(email).trim();
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: "insensitive" },
      },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    const match = await bcrypt.compare(String(password), user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    const roleName = user.role.name;

    const token = generateToken({
      sub: String(user.id),
      role: roleName,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: roleName,
        roleId: user.roleId,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  login,
};
