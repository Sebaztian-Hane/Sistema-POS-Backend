# Eagle Gaming POS — Backend Documentation

## Tabla de contenidos
1. [Descripción general](#descripción-general)
2. [Stack tecnológico](#stack-tecnológico)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Base de datos](#base-de-datos)
5. [Cómo funciona cada tabla](#cómo-funciona-cada-tabla)
6. [Relaciones entre tablas](#relaciones-entre-tablas)
7. [Flujo de una venta](#flujo-de-una-venta)
8. [Estructura de carpetas src/](#estructura-de-carpetas-src)
9. [Instalación y configuración](#instalación-y-configuración)
10. [Schema de Prisma](#schema-de-prisma)
11. [Variables de entorno](#variables-de-entorno)
12. [Scripts disponibles](#scripts-disponibles)

---

## Descripción general

Eagle Gaming POS es un sistema de punto de venta (POS) desarrollado con React en el frontend y Express + PostgreSQL en el backend. Permite gestionar ventas, productos, stock y clientes. Está diseñado para escalar en el futuro hacia un sistema de facturación electrónica SUNAT sin necesidad de cambiar la estructura de la base de datos.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL |
| ORM | Prisma |
| Autenticación | JWT (jsonwebtoken) |
| Encriptación | bcryptjs |
| Variables de entorno | dotenv |

---

## Estructura del proyecto

```
eagle-gaming-pos/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       ← definición de la BD
│   │   └── seed.js             ← datos iniciales
│   ├── src/
│   │   ├── controllers/        ← lógica de negocio
│   │   │   ├── auth.controller.js
│   │   │   ├── users.controller.js
│   │   │   ├── products.controller.js
│   │   │   ├── categories.controller.js
│   │   │   ├── customers.controller.js
│   │   │   ├── sales.controller.js
│   │   │   └── notifications.controller.js
│   │   ├── routes/             ← definición de endpoints
│   │   │   ├── auth.routes.js
│   │   │   ├── users.routes.js
│   │   │   ├── products.routes.js
│   │   │   ├── categories.routes.js
│   │   │   ├── customers.routes.js
│   │   │   ├── sales.routes.js
│   │   │   └── notifications.routes.js
│   │   ├── middlewares/        ← filtros de peticiones
│   │   │   ├── auth.middleware.js
│   │   │   └── role.middleware.js
│   │   ├── helpers/            ← funciones reutilizables
│   │   │   ├── jwt.helper.js
│   │   │   └── pagination.helper.js
│   │   ├── validations/        ← validación de datos entrantes
│   │   │   ├── auth.validation.js
│   │   │   ├── product.validation.js
│   │   │   └── sale.validation.js
│   │   ├── libs/
│   │   │   └── prisma.js       ← instancia única de Prisma
│   │   └── app.js              ← punto de entrada del servidor
│   ├── .env
│   ├── .gitignore
│   └── package.json
└── frontend/
```

---

## Base de datos

### Resumen de tablas

| Grupo | Tablas | Total |
|---|---|---|
| Auth | roles, users | 2 |
| Clientes | customers | 1 |
| Productos | categories, products, product_images, stock_movements | 4 |
| Ventas | sales, sale_items, payment_methods, sale_payments | 4 |
| Soporte | audit_log, notifications | 2 |
| **Total** | | **13 tablas** |

---

## Cómo funciona cada tabla

### ROLES
Tabla catálogo fija. Solo contiene los roles del sistema. No se modifica en el uso normal.

```
roles
├── id    → identificador único
└── name  → ADMIN | VENDEDOR
```

### USERS
Usuarios que inician sesión en el sistema (vendedores y administradores). La contraseña nunca se guarda en texto plano, siempre encriptada con bcrypt.

```
users
├── id           → identificador único
├── username     → nombre de usuario único
├── email        → correo único
├── passwordHash → contraseña encriptada con bcrypt
├── roleId       → referencia a roles (ADMIN o VENDEDOR)
├── isActive     → permite desactivar sin eliminar
└── createdAt    → fecha de registro
```

### CUSTOMERS
Clientes del negocio. En un POS muchas ventas se hacen sin identificar al cliente, por eso `customerId` en `sales` es opcional (puede ser NULL). Esta tabla guarda solo a los clientes que decidieron dar sus datos o que son clientes frecuentes. Está diseñada para soportar facturación SUNAT en el futuro sin cambios.

```
customers
├── id            → identificador único
├── nombre        → nombre completo o razón social
├── tipoDocumento → DNI | RUC | CE | PASAPORTE | SIN_DOC
├── nroDocumento  → número de DNI o RUC (opcional)
├── email         → correo (opcional)
├── telefono      → teléfono (opcional)
├── direccion     → dirección (opcional, obligatorio en facturas SUNAT futuras)
├── isActive      → permite desactivar sin eliminar
└── createdAt     → fecha de registro
```

> **Nota futura:** Cuando se implemente SUNAT, los clientes con `tipoDocumento = RUC` podrán recibir facturas. Los de `DNI` solo boletas. Esta distinción ya está contemplada en el diseño actual.

### CATEGORIES
Categorías de productos. Un producto pertenece a una categoría.

```
categories
├── id          → identificador único
├── name        → nombre de la categoría
└── description → descripción (opcional)
```

### PRODUCTS
Catálogo de productos del negocio.

```
products
├── id            → identificador único
├── sku           → código interno del producto (único, opcional)
├── name          → nombre del producto
├── description   → descripción (opcional)
├── price         → precio de venta (con 2 decimales)
├── cost          → costo del producto (para calcular margen de ganancia)
├── stockCurrent  → unidades disponibles actualmente
├── stockMin      → mínimo de stock permitido (dispara notificación si baja)
├── categoryId    → referencia a categories (opcional)
├── coverImageUrl → URL de la imagen principal
├── gallery       → JSON con array de URLs de imágenes adicionales
├── tags          → JSON con array de etiquetas
├── isFeatured    → si aparece destacado en el POS
├── isActive      → permite desactivar sin eliminar
└── createdAt     → fecha de registro
```

### PRODUCT_IMAGES
Imágenes adicionales de un producto. La imagen principal va en `products.coverImageUrl`. Las imágenes de galería van aquí.

```
product_images
├── id        → identificador único
├── productId → referencia a products
├── url       → URL de la imagen
└── order     → orden de visualización
```

### STOCK_MOVEMENTS
Historial de todos los cambios de stock de cada producto. Cada vez que el stock sube o baja por cualquier razón, queda registrado aquí. Permite saber exactamente por qué el stock tiene el número que tiene.

```
stock_movements
├── id          → identificador único
├── productId   → referencia a products
├── type        → ENTRADA | SALIDA | VENTA | AJUSTE | DEVOLUCION
├── quantity    → cantidad que cambió
├── referenceId → id de la venta si el movimiento fue por una venta
├── note        → observación adicional (opcional)
└── createdAt   → fecha y hora del movimiento
```

**Tipos de movimiento:**
| Tipo | Cuándo se usa |
|---|---|
| ENTRADA | Llegó mercadería nueva |
| SALIDA | Salió stock sin ser venta (pérdida, regalo, etc.) |
| VENTA | Se descontó por una venta |
| AJUSTE | Corrección manual del stock |
| DEVOLUCION | Cliente devolvió un producto |

### SALES
Cabecera de cada venta. Una venta puede tener muchos productos (sale_items) y puede pagarse de varias formas (sale_payments).

```
sales
├── id         → identificador único
├── userId     → referencia a users (quién realizó la venta)
├── customerId → referencia a customers (opcional, puede ser NULL)
├── subtotal   → total sin descuentos
├── descuento  → descuento aplicado
├── total      → monto final cobrado
├── status     → COMPLETADA | ANULADA | PENDIENTE_PAGO
└── createdAt  → fecha y hora de la venta
```

### SALE_ITEMS
Detalle de productos dentro de una venta. Si una venta tuvo 3 productos distintos, habrá 3 registros en esta tabla. Los campos `nombreSnapshot` y `precioSnapshot` guardan el nombre y precio del producto en el momento de la venta para que el historial no cambie si el producto se modifica después.

```
sale_items
├── id             → identificador único
├── saleId         → referencia a sales
├── productId      → referencia a products
├── nombreSnapshot → nombre del producto AL MOMENTO de la venta
├── precioSnapshot → precio del producto AL MOMENTO de la venta
├── quantity       → cantidad vendida
├── descuento      → descuento aplicado al ítem
└── subtotal       → quantity × precioSnapshot − descuento
```

> **¿Por qué snapshots?** Si hoy vendes un teclado a S/50 y mañana cambias el precio a S/80, el historial de hoy debe seguir mostrando S/50. Sin snapshots mostraría S/80, lo cual es incorrecto.

### PAYMENT_METHODS
Catálogo de métodos de pago disponibles. Tabla fija que se llena en el seed inicial.

```
payment_methods
├── id       → identificador único
├── name     → Efectivo | Tarjeta | Yape | Plin | Transferencia
└── isActive → permite desactivar métodos sin eliminarlos
```

### SALE_PAYMENTS
Registra cómo se pagó cada venta. Está separado de `sales` porque una venta puede pagarse con más de un método (por ejemplo mitad Yape y mitad efectivo).

```
sale_payments
├── id              → identificador único
├── saleId          → referencia a sales
├── paymentMethodId → referencia a payment_methods
└── amount          → monto pagado con ese método
```

### AUDIT_LOG
Registro de todas las acciones importantes que realiza cada usuario. Útil para trazabilidad y seguridad.

```
audit_log
├── id        → identificador único
├── userId    → referencia a users (quién hizo la acción)
├── action    → qué hizo (CREATE_SALE, UPDATE_PRODUCT, DELETE_CLIENT...)
├── tableName → en qué tabla ocurrió
├── recordId  → id del registro afectado
├── payload   → JSON con los datos del cambio
└── createdAt → fecha y hora de la acción
```

### NOTIFICATIONS
Alertas generadas automáticamente por el sistema.

```
notifications
├── id          → identificador único
├── type        → STOCK_MINIMO | VENTA_ANULADA
├── message     → texto de la notificación
├── referenceId → id del registro relacionado
├── isRead      → si ya fue vista
└── createdAt   → fecha de generación
```

**Tipos de notificación:**
| Tipo | Cuándo se genera |
|---|---|
| STOCK_MINIMO | El stock de un producto bajó del mínimo permitido |
| VENTA_ANULADA | Se anuló una venta completada |

---

## Relaciones entre tablas

```
Role ──────────────── User ──────────────── Sale ──────── SaleItem ──── Product ──── Category
                       │                     │                               │
                       │                     └──── SalePayment               ├── ProductImage
                       │                               │                     └── StockMovement
                       └──── AuditLog            PaymentMethod
                       
                                        Customer ──── Sale
```

---

## Flujo de una venta

**Escenario: vendedor vende 2 productos, paga con Yape S/50 y Efectivo S/20**

```
1. users          → se identifica quién vende          (userId = 3)
2. customers      → cliente dio sus datos o es NULL    (customerId = 7 o NULL)
3. products       → se consultan productos del carrito
4. sales          → se crea 1 registro cabecera
5. sale_items     → se crean N registros, uno por producto
6. sale_payments  → se crean N registros por método de pago
7. stock_movements→ se crean N registros descontando stock
8. products       → se actualiza stockCurrent de cada producto
```

**Cómo quedan los registros en la BD:**

```
sales         → id=1, userId=3, customerId=7, total=70, status=COMPLETADA

sale_items    → id=1, saleId=1, productId=10, nombreSnapshot="Teclado Gamer",
                     precioSnapshot=50, quantity=1, subtotal=50
              → id=2, saleId=1, productId=15, nombreSnapshot="Mouse Pad XL",
                     precioSnapshot=20, quantity=1, subtotal=20

sale_payments → id=1, saleId=1, paymentMethodId=3, amount=50  ← Yape
              → id=2, saleId=1, paymentMethodId=1, amount=20  ← Efectivo

stock_movements → id=1, productId=10, type=VENTA, quantity=1, referenceId=1
               → id=2, productId=15, type=VENTA, quantity=1, referenceId=1
```

---

## Estructura de carpetas src/

### `app.js`
Punto de entrada del servidor. Configura Express, conecta todas las rutas y activa middlewares globales como CORS y JSON parser.

### `controllers/`
Lógica de negocio. Cada archivo maneja un módulo. Recibe la petición, procesa la lógica usando Prisma y devuelve la respuesta.

| Archivo | Responsabilidad |
|---|---|
| auth.controller.js | Login y registro |
| users.controller.js | Gestión de usuarios |
| products.controller.js | CRUD de productos y stock |
| categories.controller.js | CRUD de categorías |
| customers.controller.js | CRUD de clientes |
| sales.controller.js | Crear venta, anular, historial |
| notifications.controller.js | Leer y marcar notificaciones |

### `routes/`
Define qué URL llama a qué controller. No contiene lógica.

```
POST /api/auth/login      → auth.controller → login()
GET  /api/products        → products.controller → getAll()
POST /api/sales           → sales.controller → create()
```

### `middlewares/`
Filtros que se ejecutan antes del controller.

| Archivo | Qué hace |
|---|---|
| auth.middleware.js | Verifica que el token JWT sea válido |
| role.middleware.js | Verifica que el usuario tenga el rol necesario |

### `helpers/`
Funciones pequeñas reutilizables en varios controllers.

| Archivo | Qué hace |
|---|---|
| jwt.helper.js | Generar y verificar tokens JWT |
| pagination.helper.js | Lógica de paginación para listas |

### `validations/`
Valida que los datos que llegan en las peticiones sean correctos antes de llegar al controller.

| Archivo | Qué valida |
|---|---|
| auth.validation.js | Email válido, password mínimo, campos requeridos |
| product.validation.js | Precio numérico, stock no negativo, nombre requerido |
| sale.validation.js | Items no vacíos, cantidades válidas, método de pago válido |

### `libs/prisma.js`
Crea y exporta una única instancia de Prisma Client que usan todos los controllers. Evita crear múltiples conexiones a la BD.

### Flujo completo de una petición

```
Frontend: POST /api/sales
        ↓
    app.js recibe la petición
        ↓
    auth.middleware.js → verifica el token JWT
        ↓
    role.middleware.js → verifica que sea VENDEDOR o ADMIN
        ↓
    sale.validation.js → verifica que los datos sean correctos
        ↓
    sales.controller.js → ejecuta la lógica de negocio
        ↓
    libs/prisma.js → conecta con PostgreSQL y guarda los datos
        ↓
    controller → devuelve respuesta JSON al frontend
```

---

## Instalación y configuración

### Requisitos previos
- Node.js 18+
- PostgreSQL 14+
- npm

### Pasos

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd eagle-gaming-pos/backend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus datos de PostgreSQL

# 4. Crear las tablas en la BD
npx prisma migrate dev --name init

# 5. Cargar datos iniciales
node prisma/seed.js

# 6. Iniciar el servidor en desarrollo
npm run dev
```

---

## Schema de Prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Role {
  id    Int    @id @default(autoincrement())
  name  String @unique
  users User[]
}

model User {
  id           Int        @id @default(autoincrement())
  username     String     @unique
  email        String     @unique
  passwordHash String
  roleId       Int
  isActive     Boolean    @default(true)
  createdAt    DateTime   @default(now())
  role         Role       @relation(fields: [roleId], references: [id])
  sales        Sale[]
  auditLogs    AuditLog[]
}

enum TipoDocumento {
  DNI
  RUC
  CE
  PASAPORTE
  SIN_DOC
}

model Customer {
  id            Int           @id @default(autoincrement())
  nombre        String
  tipoDocumento TipoDocumento @default(SIN_DOC)
  nroDocumento  String?
  email         String?
  telefono      String?
  direccion     String?
  isActive      Boolean       @default(true)
  createdAt     DateTime      @default(now())
  sales         Sale[]
}

model Category {
  id          Int       @id @default(autoincrement())
  name        String
  description String?
  products    Product[]
}

model Product {
  id             Int             @id @default(autoincrement())
  sku            String?         @unique
  name           String
  description    String?
  price          Decimal         @db.Decimal(10, 2)
  cost           Decimal?        @db.Decimal(10, 2)
  stockCurrent   Int             @default(0)
  stockMin       Int             @default(0)
  categoryId     Int?
  coverImageUrl  String?
  gallery        Json?
  tags           Json?
  isFeatured     Boolean         @default(false)
  isActive       Boolean         @default(true)
  createdAt      DateTime        @default(now())
  category       Category?       @relation(fields: [categoryId], references: [id])
  images         ProductImage[]
  saleItems      SaleItem[]
  stockMovements StockMovement[]
}

model ProductImage {
  id        Int     @id @default(autoincrement())
  productId Int
  url       String
  order     Int     @default(0)
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

enum StockMovementType {
  ENTRADA
  SALIDA
  VENTA
  AJUSTE
  DEVOLUCION
}

model StockMovement {
  id          Int               @id @default(autoincrement())
  productId   Int
  type        StockMovementType
  quantity    Int
  referenceId Int?
  note        String?
  createdAt   DateTime          @default(now())
  product     Product           @relation(fields: [productId], references: [id], onDelete: Cascade)
}

enum SaleStatus {
  COMPLETADA
  ANULADA
  PENDIENTE_PAGO
}

model Sale {
  id         Int        @id @default(autoincrement())
  userId     Int
  customerId Int?
  subtotal   Decimal    @db.Decimal(10, 2) @default(0)
  descuento  Decimal    @db.Decimal(10, 2) @default(0)
  total      Decimal    @db.Decimal(10, 2) @default(0)
  status     SaleStatus @default(COMPLETADA)
  createdAt  DateTime   @default(now())
  user       User          @relation(fields: [userId], references: [id])
  customer   Customer?     @relation(fields: [customerId], references: [id])
  items      SaleItem[]
  payments   SalePayment[]
}

model SaleItem {
  id             Int     @id @default(autoincrement())
  saleId         Int
  productId      Int
  nombreSnapshot String
  precioSnapshot Decimal @db.Decimal(10, 2)
  quantity       Int
  descuento      Decimal @db.Decimal(10, 2) @default(0)
  subtotal       Decimal @db.Decimal(10, 2)
  sale           Sale    @relation(fields: [saleId], references: [id], onDelete: Cascade)
  product        Product @relation(fields: [productId], references: [id])
}

model PaymentMethod {
  id       Int           @id @default(autoincrement())
  name     String        @unique
  isActive Boolean       @default(true)
  payments SalePayment[]
}

model SalePayment {
  id              Int           @id @default(autoincrement())
  saleId          Int
  paymentMethodId Int
  amount          Decimal       @db.Decimal(10, 2)
  sale            Sale          @relation(fields: [saleId], references: [id], onDelete: Cascade)
  paymentMethod   PaymentMethod @relation(fields: [paymentMethodId], references: [id])
}

model AuditLog {
  id        Int      @id @default(autoincrement())
  userId    Int?
  action    String
  tableName String?
  recordId  Int?
  payload   Json?
  createdAt DateTime @default(now())
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
}

enum NotificationType {
  STOCK_MINIMO
  VENTA_ANULADA
}

model Notification {
  id          Int              @id @default(autoincrement())
  type        NotificationType
  message     String
  referenceId Int?
  isRead      Boolean          @default(false)
  createdAt   DateTime         @default(now())
}
```

---

## Variables de entorno

```bash
# .env

# Conexión a PostgreSQL
DATABASE_URL="postgresql://usuario:password@localhost:5432/eagle_gaming_pos"

# Clave secreta para firmar los JWT
JWT_SECRET="tu_clave_secreta_aqui_debe_ser_larga_y_segura"

# Puerto del servidor
PORT=3000
```

---

## Scripts disponibles

```bash
# Iniciar en desarrollo con recarga automática
npm run dev

# Iniciar en producción
npm start

# Crear una nueva migración después de cambiar el schema
npx prisma migrate dev --name nombre_del_cambio

# Ver la BD en el navegador con Prisma Studio
npx prisma studio

# Correr el seed de datos iniciales
node prisma/seed.js

# Generar el cliente de Prisma después de cambios
npx prisma generate
```

---

## Datos iniciales (seed)

Al correr `node prisma/seed.js` se crean automáticamente:

**Roles:**
- ADMIN
- VENDEDOR

**Métodos de pago:**
- Efectivo
- Tarjeta
- Yape
- Plin
- Transferencia

---

*Documentación generada para Eagle Gaming POS v1.0*
