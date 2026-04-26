require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const productsRoutes = require("./routes/products.routes");
const categoriesRoutes = require("./routes/categories.routes");
const customersRoutes = require("./routes/customers.routes");
const salesRoutes = require("./routes/sales.routes");
const usersRoutes = require("./routes/users.routes");
const notificationsRoutes = require("./routes/notifications.routes");
const { authenticate } = require("./middlewares/auth.middleware");
const { requireStaff } = require("./middlewares/role.middleware");

const app = express();

const PORT = Number(process.env.PORT) || 3000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, name: "Eagle Gaming POS API" });
});

app.use("/api/auth", authRoutes);

const api = express.Router();
api.use(authenticate);
api.use(requireStaff);

api.use("/products", productsRoutes);
api.use("/categories", categoriesRoutes);
api.use("/customers", customersRoutes);
api.use("/sales", salesRoutes);
api.use("/users", usersRoutes);
api.use("/notifications", notificationsRoutes);

app.use("/api", api);

app.use((req, res) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

app.use((err, req, res, _next) => {
  console.error(err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    message: err.message || "Error interno del servidor",
  });
});

module.exports = app;

/**
 * Arranque solo cuando este archivo es el punto de entrada (node / nodemon).
 * En Windows a veces require.main === module falla con rutas distintas; se
 * compara también process.argv[1] con __filename resueltos.
 */
function shouldStartServer() {
  if (require.main === module) {
    return true;
  }
  const entry = process.argv[1];
  if (!entry || !require.main?.filename) {
    return false;
  }
  return path.resolve(entry) === path.resolve(__filename);
}

if (shouldStartServer()) {
  const server = app.listen(PORT, () => {
    console.log(`Eagle Gaming POS escuchando en http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    console.error("Error al abrir el puerto:", err);
    process.exitCode = 1;
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
