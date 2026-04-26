const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL no está definida en el entorno");
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

const PAYMENT_METHODS = [
  "Efectivo",
  "Tarjeta",
  "Yape",
  "Plin",
  "Transferencia",
];

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN" },
  });

  await prisma.role.upsert({
    where: { name: "VENDEDOR" },
    update: {},
    create: { name: "VENDEDOR" },
  });

  for (const name of PAYMENT_METHODS) {
    await prisma.paymentMethod.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@eaglegaming.com" },
    update: {
      username: "admin",
      passwordHash,
      roleId: adminRole.id,
      isActive: true,
    },
    create: {
      username: "admin",
      email: "admin@eaglegaming.com",
      passwordHash,
      roleId: adminRole.id,
    },
  });

  console.log("Seed completado: roles, métodos de pago y usuario admin.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
