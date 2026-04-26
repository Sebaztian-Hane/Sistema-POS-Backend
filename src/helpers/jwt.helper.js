require("dotenv").config();

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

function getSecret() {
  if (!JWT_SECRET || JWT_SECRET.length === 0) {
    throw new Error("JWT_SECRET no está definida en el entorno");
  }
  return JWT_SECRET;
}

const DEFAULT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

/**
 * @param {object} payload - Datos a firmar (p. ej. { sub, role })
 * @param {string} [expiresIn]
 * @returns {string}
 */
function generateToken(payload, expiresIn = DEFAULT_EXPIRES_IN) {
  return jwt.sign(payload, getSecret(), { expiresIn });
}

/**
 * @param {string} token
 * @returns {import("jsonwebtoken").JwtPayload | string}
 */
function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

module.exports = {
  generateToken,
  verifyToken,
};
