require("dotenv").config();

const path = require("path");
const express = require("express");
const app = express();
const cors = require("cors");

// ============================================================
// 1. Middlewares GLOBALES (deben ir PRIMERO)
// ============================================================
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  }),
);
app.use(express.json());           // ✅ Esto debe ir ANTES de las rutas
app.use(express.urlencoded({ extended: true }));

// ============================================================
// 2. Rutas PÚBLICAS (sin autenticación)
// ============================================================
const authRoutes = require("./routes/auth.routes");
app.use("/api/auth", authRoutes);

// Health check (público)
app.get("/api/health", (req, res) => {
  res.json({ ok: true, name: "Eagle Gaming POS API" });
});

// ============================================================
// 3. Middleware de AUTENTICACIÓN
// ============================================================
const { authenticate } = require("./middlewares/auth.middleware");
const { requireStaff } = require("./middlewares/role.middleware");

// ============================================================
// 4. Rutas PROTEGIDAS (requieren autenticación)
// ============================================================
const productsRoutes = require("./routes/products.routes");
const categoriesRoutes = require("./routes/categories.routes");
const customersRoutes = require("./routes/customers.routes");
const salesRoutes = require("./routes/sales.routes");
const usersRoutes = require("./routes/users.routes");
const notificationsRoutes = require("./routes/notifications.routes");

const api = express.Router();
api.use(authenticate);      // ✅ Primero verifica token
api.use(requireStaff);      // ✅ Luego verifica rol

api.use("/products", productsRoutes);
api.use("/categories", categoriesRoutes);
api.use("/customers", customersRoutes);
api.use("/sales", salesRoutes);
api.use("/users", usersRoutes);
api.use("/notifications", notificationsRoutes);

app.use("/api", api);

// ============================================================
// 5. Manejo de errores (SIEMPRE al final)
// ============================================================
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

// ============================================================
// 6. Cron job para sincronizar SUNAT
// ============================================================
const cron = require('node-cron');
const { syncPendientes } = require('./services/syncSunatStatus.service');

cron.schedule('*/5 * * * *', async () => {
  try {
    console.log('[CRON] Ejecutando syncSunatStatus...');
    await syncPendientes();
  } catch (error) {
    console.error('[CRON ERROR]', error);
  }
});

// ============================================================
// 7. Servidor
// ============================================================
const PORT = Number(process.env.PORT) || 3000;

module.exports = app;

function shouldStartServer() {
  if (require.main === module) return true;
  const entry = process.argv[1];
  if (!entry || !require.main?.filename) return false;
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