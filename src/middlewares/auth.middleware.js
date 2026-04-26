const { verifyToken } = require("../helpers/jwt.helper");

/**
 * Espera header: Authorization: Bearer <token>
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || typeof header !== "string") {
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Formato de autorización inválido" });
  }

  try {
    const decoded = verifyToken(token);
    if (typeof decoded === "string" || !decoded) {
      return res.status(401).json({ message: "Token inválido" });
    }
    const rawId = decoded.sub ?? decoded.id;
    const userId =
      typeof rawId === "string" ? parseInt(rawId, 10) : Number(rawId);
    req.user = {
      id: userId,
      role: decoded.role,
    };
    if (!Number.isFinite(req.user.id) || req.user.id <= 0) {
      return res.status(401).json({ message: "Token sin identificador de usuario" });
    }
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expirado" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token inválido" });
    }
    return next(err);
  }
}

module.exports = {
  authenticate,
};
