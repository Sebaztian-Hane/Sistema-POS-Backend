const STAFF_ROLES = ["ADMIN", "VENDEDOR"];

/**
 * Solo permite roles de staff (ADMIN o VENDEDOR).
 * Usar después de authenticate.
 */
function requireStaff(req, res, next) {
  const role = req.user?.role;
  if (!role || !STAFF_ROLES.includes(role)) {
    return res.status(403).json({ message: "No autorizado para este recurso" });
  }
  return next();
}

/**
 * @param {...string} allowedRoles - Al menos uno debe coincidir con req.user.role
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ message: "Permisos insuficientes" });
    }
    return next();
  };
}

module.exports = {
  requireStaff,
  requireRole,
  STAFF_ROLES,
};
