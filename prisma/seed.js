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

// CATEGORÍAS
const CATEGORIAS = [
  { name: "Laptops", description: "Laptops gaming y de oficina" },
  { name: "Refrigeración Líquida", description: "Sistemas de refrigeración líquida para PC" },
  { name: "Monitores", description: "Monitores gaming y profesionales" },
  { name: "PC Completas", description: "Computadoras armadas listas para usar" },
  { name: "Procesadores", description: "CPUs para PC gaming y trabajo" },
  { name: "Tarjeta de Video", description: "GPUs para gaming y renderizado" },
  { name: "Placa Madre", description: "Motherboards para todas las plataformas" },
  { name: "Disco SSD", description: "Almacenamiento rápido SSD" },
  { name: "Periféricos", description: "Teclados, mouses, audífonos" },
  { name: "Case", description: "Gabinete para PC" },
  { name: "Fuente de Poder", description: "Fuentes de alimentación certificadas" },
  { name: "Memoria RAM", description: "Módulos de memoria RAM" },
  { name: "Estabilizador", description: "Estabilizadores y UPS" },
];

// PRODUCTOS
const PRODUCTOS = [
  // Laptops
  { sku: "LAP-001", name: "Laptop Gaming Eagle Pro", description: "Intel i7, RTX 4060, 16GB RAM, 1TB SSD", price: 4299.99, cost: 3500.00, stockCurrent: 10, stockMin: 3, category: "Laptops", isFeatured: true, tags: ["laptop", "gaming", "i7", "rtx"] },
  { sku: "LAP-002", name: "Laptop Ultrabook Eagle", description: "Intel i5, 8GB RAM, 512GB SSD, pantalla 14\"", price: 2499.99, cost: 2000.00, stockCurrent: 15, stockMin: 5, category: "Laptops", tags: ["laptop", "ultrabook", "oficina"] },

  // Refrigeración Líquida
  { sku: "REF-001", name: "Cooler Líquido 240mm Eagle", description: "Sistema de refrigeración líquida 240mm RGB", price: 299.99, cost: 180.00, stockCurrent: 12, stockMin: 4, category: "Refrigeración Líquida", isFeatured: true, tags: ["cooler", "liquida", "240mm", "rgb"] },
  { sku: "REF-002", name: "Cooler Líquido 360mm Eagle Pro", description: "Sistema de refrigeración líquida 360mm pantalla LCD", price: 499.99, cost: 320.00, stockCurrent: 8, stockMin: 2, category: "Refrigeración Líquida", tags: ["cooler", "liquida", "360mm", "lcd"] },

  // Monitores
  { sku: "MON-001", name: "Monitor 24\" 165Hz Eagle", description: "Monitor gaming 165Hz, 1ms, Full HD", price: 699.99, cost: 480.00, stockCurrent: 20, stockMin: 5, category: "Monitores", isFeatured: true, tags: ["monitor", "165hz", "gaming", "fhd"] },
  { sku: "MON-002", name: "Monitor 27\" 144Hz 2K Eagle", description: "Monitor curvo 144Hz, 2K, 1ms", price: 1299.99, cost: 950.00, stockCurrent: 10, stockMin: 3, category: "Monitores", tags: ["monitor", "curvo", "2k", "144hz"] },

  // PC Completas
  { sku: "PC-001", name: "PC Gamer Eagle i5", description: "Intel i5, RTX 3060, 16GB RAM, 1TB SSD", price: 3999.99, cost: 3200.00, stockCurrent: 5, stockMin: 2, category: "PC Completas", isFeatured: true, tags: ["pc", "gamer", "i5", "rtx3060"] },
  { sku: "PC-002", name: "PC Gamer Eagle i7", description: "Intel i7, RTX 4070, 32GB RAM, 2TB SSD", price: 6999.99, cost: 5800.00, stockCurrent: 3, stockMin: 1, category: "PC Completas", tags: ["pc", "gamer", "i7", "rtx4070"] },

  // Procesadores
  { sku: "CPU-001", name: "Intel Core i5-13600K", description: "14 núcleos, 20 hilos, hasta 5.1GHz", price: 899.99, cost: 750.00, stockCurrent: 15, stockMin: 5, category: "Procesadores", tags: ["intel", "i5", "13600k"] },
  { sku: "CPU-002", name: "Intel Core i7-13700K", description: "16 núcleos, 24 hilos, hasta 5.4GHz", price: 1299.99, cost: 1100.00, stockCurrent: 10, stockMin: 3, category: "Procesadores", isFeatured: true, tags: ["intel", "i7", "13700k"] },
  { sku: "CPU-003", name: "AMD Ryzen 7 7800X3D", description: "8 núcleos, 16 hilos, cache 3D V-Cache", price: 1499.99, cost: 1300.00, stockCurrent: 8, stockMin: 2, category: "Procesadores", tags: ["amd", "ryzen7", "7800x3d"] },

  // Tarjeta de Video
  { sku: "GPU-001", name: "RTX 4060 Ti 8GB Eagle", description: "GPU NVIDIA RTX 4060 Ti 8GB GDDR6", price: 1799.99, cost: 1500.00, stockCurrent: 12, stockMin: 4, category: "Tarjeta de Video", tags: ["nvidia", "rtx4060", "8gb"] },
  { sku: "GPU-002", name: "RTX 4070 Ti 12GB Eagle Pro", description: "GPU NVIDIA RTX 4070 Ti 12GB GDDR6X", price: 2999.99, cost: 2600.00, stockCurrent: 8, stockMin: 2, category: "Tarjeta de Video", isFeatured: true, tags: ["nvidia", "rtx4070", "12gb"] },
  { sku: "GPU-003", name: "RX 7800 XT 16GB Eagle", description: "GPU AMD Radeon RX 7800 XT 16GB", price: 2499.99, cost: 2100.00, stockCurrent: 6, stockMin: 2, category: "Tarjeta de Video", tags: ["amd", "rx7800", "16gb"] },

  // Placa Madre
  { sku: "MB-001", name: "Motherboard Z790 Eagle", description: "Placa madre Z790 para Intel LGA1700, DDR5", price: 899.99, cost: 720.00, stockCurrent: 10, stockMin: 3, category: "Placa Madre", tags: ["z790", "intel", "ddr5"] },
  { sku: "MB-002", name: "Motherboard B650 Eagle", description: "Placa madre B650 para AMD AM5, DDR5", price: 799.99, cost: 640.00, stockCurrent: 10, stockMin: 3, category: "Placa Madre", tags: ["b650", "amd", "ddr5"] },

  // Disco SSD
  { sku: "SSD-001", name: "SSD 1TB NVMe Eagle", description: "SSD NVMe PCIe 4.0, 7000MB/s lectura", price: 299.99, cost: 220.00, stockCurrent: 25, stockMin: 8, category: "Disco SSD", isFeatured: true, tags: ["ssd", "nvme", "1tb", "gen4"] },
  { sku: "SSD-002", name: "SSD 2TB NVMe Eagle Pro", description: "SSD NVMe PCIe 4.0, 7400MB/s lectura", price: 499.99, cost: 380.00, stockCurrent: 15, stockMin: 5, category: "Disco SSD", tags: ["ssd", "nvme", "2tb", "gen4"] },

  // Periféricos
  { sku: "PER-001", name: "Teclado Mecánico RGB Eagle", description: "Teclado mecánico switches rojos, RGB", price: 199.99, cost: 120.00, stockCurrent: 30, stockMin: 10, category: "Periféricos", tags: ["teclado", "mecanico", "rgb"] },
  { sku: "PER-002", name: "Mouse Gaming Eagle Pro", description: "Mouse 16000 DPI, 7 botones, RGB", price: 99.99, cost: 60.00, stockCurrent: 35, stockMin: 12, category: "Periféricos", tags: ["mouse", "gaming", "16000dpi"] },
  { sku: "PER-003", name: "Audífonos 7.1 Eagle", description: "Audífonos gaming con sonido envolvente 7.1", price: 149.99, cost: 90.00, stockCurrent: 20, stockMin: 6, category: "Periféricos", isFeatured: true, tags: ["audifonos", "7.1", "gaming"] },

  // Case
  { sku: "CASE-001", name: "Gabinete Eagle RGB", description: "Gabinete ATX con 4 ventiladores RGB", price: 249.99, cost: 160.00, stockCurrent: 15, stockMin: 5, category: "Case", tags: ["gabinete", "atx", "rgb"] },
  { sku: "CASE-002", name: "Gabinete Eagle Pro", description: "Gabinete ATX panel vidrio templado, 6 ventiladores", price: 349.99, cost: 240.00, stockCurrent: 10, stockMin: 3, category: "Case", isFeatured: true, tags: ["gabinete", "vidrio", "rgb"] },

  // Fuente de Poder
  { sku: "PSU-001", name: "Fuente 750W 80+ Gold Eagle", description: "Fuente modular 750W certificación Gold", price: 399.99, cost: 300.00, stockCurrent: 12, stockMin: 4, category: "Fuente de Poder", tags: ["fuente", "750w", "gold", "modular"] },
  { sku: "PSU-002", name: "Fuente 850W 80+ Platinum Eagle", description: "Fuente modular 850W certificación Platinum", price: 599.99, cost: 460.00, stockCurrent: 8, stockMin: 2, category: "Fuente de Poder", isFeatured: true, tags: ["fuente", "850w", "platinum", "modular"] },

  // Memoria RAM
  { sku: "RAM-001", name: "RAM 16GB DDR5 6000MHz Eagle", description: "Módulo de memoria 16GB DDR5 6000MHz RGB", price: 299.99, cost: 220.00, stockCurrent: 20, stockMin: 6, category: "Memoria RAM", tags: ["ram", "ddr5", "16gb", "6000mhz"] },
  { sku: "RAM-002", name: "RAM 32GB DDR5 6400MHz Eagle Pro", description: "Kit 2x16GB DDR5 6400MHz RGB", price: 599.99, cost: 480.00, stockCurrent: 15, stockMin: 5, category: "Memoria RAM", isFeatured: true, tags: ["ram", "ddr5", "32gb", "6400mhz"] },

  // Estabilizador
  { sku: "EST-001", name: "Estabilizador 1000VA Eagle", description: "Estabilizador de voltaje 1000VA, 6 tomas", price: 149.99, cost: 100.00, stockCurrent: 18, stockMin: 6, category: "Estabilizador", tags: ["estabilizador", "1000va", "proteccion"] },
  { sku: "EST-002", name: "UPS 1500VA Eagle Pro", description: "UPS interactivo 1500VA, batería respaldo", price: 399.99, cost: 300.00, stockCurrent: 10, stockMin: 3, category: "Estabilizador", isFeatured: true, tags: ["ups", "1500va", "bateria"] },
];

async function main() {
  // Crear roles
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

  // Crear métodos de pago
  for (const name of PAYMENT_METHODS) {
    await prisma.paymentMethod.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  // Crear categorías
  const categoriasMap = new Map();
  for (const cat of CATEGORIAS) {
    const categoria = await prisma.category.upsert({
      where: { name: cat.name },
      update: { description: cat.description },
      create: cat,
    });
    categoriasMap.set(cat.name, categoria.id);
  }

  // Crear productos
  for (const producto of PRODUCTOS) {
    const categoryId = categoriasMap.get(producto.category);

    await prisma.product.upsert({
      where: { sku: producto.sku },
      update: {
        name: producto.name,
        description: producto.description,
        price: producto.price,
        cost: producto.cost,
        stockCurrent: producto.stockCurrent,
        stockMin: producto.stockMin,
        categoryId: categoryId,
        isFeatured: producto.isFeatured || false,
        isActive: true,
        tags: producto.tags || null,
      },
      create: {
        sku: producto.sku,
        name: producto.name,
        description: producto.description,
        price: producto.price,
        cost: producto.cost,
        stockCurrent: producto.stockCurrent,
        stockMin: producto.stockMin,
        categoryId: categoryId,
        isFeatured: producto.isFeatured || false,
        isActive: true,
        tags: producto.tags || null,
      },
    });
  }

  // Crear usuario admin
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

  console.log("✅ Seed completado:");
  console.log(`   - ${Object.keys(PAYMENT_METHODS).length} métodos de pago`);
  console.log(`   - ${CATEGORIAS.length} categorías`);
  console.log(`   - ${PRODUCTOS.length} productos`);
  console.log(`   - Usuario admin creado (email: admin@eaglegaming.com, pass: admin123)`);
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });