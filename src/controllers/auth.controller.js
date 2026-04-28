const { generateToken } = require("../helpers/jwt.helper");
const authService = require("../services/auth.service");

async function login(req, res, next) {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({
        message: "Correo y contraseña son obligatorios",
      });
    }

    const user = await authService.verifyCredentials(email, password);

    if (!user) {
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
