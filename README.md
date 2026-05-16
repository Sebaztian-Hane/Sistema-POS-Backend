# 🎮 Eagle Gaming POS — Backend API Documentation

**Sistema de Punto de Venta (POS) con integración SUNAT para facturación electrónica**

- 📚 [Tabla de contenidos](#tabla-de-contenidos)
- 🚀 [Inicio rápido](#-inicio-rápido)
- 📡 [Documentación de endpoints](#-documentación-completa-de-endpoints)
- 🗂️ [Estructura del proyecto](#-estructura-del-proyecto)
- 🔐 [Autenticación](#-autenticación)

---

## Tabla de contenidos

1. [Características](#características)
2. [Stack tecnológico](#stack-tecnológico)
3. [Inicio rápido](#-inicio-rápido)
4. [Documentación de endpoints](#-documentación-completa-de-endpoints)
5. [Estructura del proyecto](#-estructura-del-proyecto)
6. [Base de datos](#base-de-datos)
7. [Autenticación](#-autenticación)
8. [Ejemplos de uso](#-ejemplos-de-uso)
9. [Variables de entorno](#variables-de-entorno)

---

## Características

✅ **Autenticación JWT** - Seguridad con tokens de sesión  
✅ **CRUD completo** - Productos, categorías, clientes, usuarios  
✅ **Gestión de ventas** - Registro de transacciones y pagos múltiples  
✅ **Control de inventario** - Stock y movimientos  
✅ **Integración SUNAT** - Facturación y boletas electrónicas  
✅ **Sistema de roles** - ADMIN y VENDEDOR con permisos diferenciados  
✅ **Notificaciones** - Alertas de stock bajo y eventos del sistema  
✅ **Auditoría** - Registro de todas las acciones de usuarios  

---

## Stack tecnológico

| Componente | Tecnología | Versión |
|---|---|---|
| **Runtime** | Node.js | 18+ |
| **Framework** | Express.js | 5.2 |
| **Base de datos** | PostgreSQL | 14+ |
| **ORM** | Prisma | 7.7 |
| **Autenticación** | JWT (jsonwebtoken) | 9.0 |
| **Encriptación** | bcryptjs | 3.0 |
| **HTTP Client** | Axios | 1.16 |
| **Validación** | express-validator | (implícito) |
| **CORS** | cors | 2.8 |
| **Desarrollo** | Nodemon | 3.1 |

---

## 🚀 Inicio rápido

### Requisitos previos
- Node.js 18+
- npm o yarn
- Docker (opcional pero recomendado para PostgreSQL)

### 1️⃣ Opción A: Con Docker (Recomendado - 5 minutos)

```bash
# Levanta PostgreSQL en Docker
docker run --name eagle-pos-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=admin123 \
  -e POSTGRES_DB=eagle_pos \
  -p 5432:5432 \
  -d postgres:15
```

### 2️⃣ Opción B: PostgreSQL Local

Asegúrate de que PostgreSQL esté corriendo en `localhost:5432`

### 3️⃣ Configurar ambiente

```bash
# Clonar el repositorio
git clone https://github.com/Sebaztian-Hane/Sistema-POS-Backend.git
cd Sistema-POS-Backend

# Crear archivo .env
cat > .env << EOF
DATABASE_URL="postgresql://postgres:admin123@localhost:5432/eagle_pos?schema=public"
JWT_SECRET="eagle_gaming_pos_secret_key_2024"
PORT=3000
CORS_ORIGIN=true
API_PERU_TOKEN="obtener_en_https://apiperu.dev"
EOF

# ⚠️ IMPORTANTE: Reemplaza "obtener_en_https://apiperu.dev" con tu token real
```

> **Nota:** El token `API_PERU_TOKEN` es necesario para validar clientes con DNI/RUC reales contra SUNAT. Obtén tu token gratuito en https://apiperu.dev/

### 4️⃣ Instalar dependencias y configurar BD

```bash
# Instalar paquetes
npm install

# Generar cliente de Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev --name init_firme

# Cargar datos iniciales (Admin, roles, métodos de pago)
node prisma/seed.js
```

### 5️⃣ Iniciar servidor

```bash
# Desarrollo (con hot-reload)
npm run dev

# Producción
npm start
```

El servidor estará disponible en `http://localhost:3000`

---

## 📡 Documentación completa de endpoints

### Base URL
```
http://localhost:3000/api
```

### Estructura de respuestas

**Éxito (200):**
```json
{
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 50 }
}
```

**Error (4xx/5xx):**
```json
{
  "message": "Descripción del error"
}
```

---

## 🔐 Autenticación (Public)

### `POST /auth/login`
Iniciar sesión y obtener JWT token.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `POST` |
| **URL** | `http://localhost:3000/api/auth/login` |
| **Headers** | `Content-Type: application/json` |

**Body (JSON):**
```json
{
  "email": "admin@pos.com",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@pos.com",
    "role": "ADMIN",
    "roleId": 1
  }
}
```

**Errores posibles:**
- `400` - Correo y contraseña son obligatorios
- `401` - Credenciales incorrectas

**Notas:**
- El token expira en 7 días (configurable en jwt.helper.js)
- Usar este token en el header `Authorization: Bearer <token>` para peticiones protegidas
- Las credenciales por defecto: `admin@pos.com` / `admin123` (creadas por seed.js)

---

## 📦 Productos (Protected - Requiere autenticación)

### `GET /products`
Listar todos los productos con paginación.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `GET` |
| **URL** | `http://localhost:3000/api/products?page=1&limit=20` |
| **Headers** | `Authorization: Bearer <token>` |

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "sku": "TECLADO-001",
      "name": "Teclado Gamer RGB",
      "description": "Teclado mecánico con iluminación RGB",
      "price": "150.00",
      "cost": "80.00",
      "stockCurrent": 25,
      "stockMin": 5,
      "categoryId": 1,
      "coverImageUrl": "https://example.com/teclado.jpg",
      "tags": ["gaming", "pc", "periféricos"],
      "isFeatured": true,
      "isActive": true,
      "createdAt": "2024-05-16T10:30:00Z",
      "category": { "id": 1, "name": "Periféricos" }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 87
  }
}
```

---

### `GET /products/:id`
Obtener detalles completos de un producto.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `GET` |
| **URL** | `http://localhost:3000/api/products/1` |
| **Headers** | `Authorization: Bearer <token>` |

**Response (200):**
```json
{
  "id": 1,
  "sku": "TECLADO-001",
  "name": "Teclado Gamer RGB",
  "description": "Teclado mecánico con iluminación RGB",
  "price": "150.00",
  "cost": "80.00",
  "stockCurrent": 25,
  "stockMin": 5,
  "categoryId": 1,
  "coverImageUrl": "https://example.com/teclado.jpg",
  "gallery": [
    { "url": "https://example.com/teclado1.jpg", "order": 1 },
    { "url": "https://example.com/teclado2.jpg", "order": 2 }
  ],
  "tags": ["gaming", "pc", "periféricos"],
  "isFeatured": true,
  "isActive": true,
  "createdAt": "2024-05-16T10:30:00Z",
  "category": { "id": 1, "name": "Periféricos" }
}
```

---

### `POST /products` (Solo ADMIN)
Crear un nuevo producto.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `POST` |
| **URL** | `http://localhost:3000/api/products` |
| **Headers** | `Authorization: Bearer <token>` |
| | `Content-Type: application/json` |

**Body (JSON):**
```json
{
  "sku": "MOUSE-001",
  "name": "Mouse Gamer Inalámbrico",
  "description": "Mouse de 16000 DPI",
  "price": 85.50,
  "cost": 40.00,
  "stockCurrent": 50,
  "stockMin": 10,
  "categoryId": 1,
  "coverImageUrl": "https://example.com/mouse.jpg",
  "tags": ["gaming", "pc"],
  "isFeatured": false
}
```

**Response (201):**
```json
{
  "id": 2,
  "sku": "MOUSE-001",
  "name": "Mouse Gamer Inalámbrico",
  "description": "Mouse de 16000 DPI",
  "price": "85.50",
  "cost": "40.00",
  "stockCurrent": 50,
  "stockMin": 10,
  "categoryId": 1,
  "coverImageUrl": "https://example.com/mouse.jpg",
  "tags": ["gaming", "pc"],
  "isFeatured": false,
  "isActive": true,
  "createdAt": "2024-05-16T11:00:00Z"
}
```

---

### `PUT /products/:id` (Solo ADMIN)
Actualizar datos de un producto.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `PUT` |
| **URL** | `http://localhost:3000/api/products/1` |
| **Headers** | `Authorization: Bearer <token>` |
| | `Content-Type: application/json` |

**Body (JSON):**
```json
{
  "name": "Teclado Gamer RGB V2",
  "price": 160.00,
  "stockMin": 8
}
```

**Response (200):**
```json
{
  "id": 1,
  "name": "Teclado Gamer RGB V2",
  "price": "160.00",
  "stockMin": 8,
  ...resto de campos
}
```

---

### `DELETE /products/:id` (Solo ADMIN)
Eliminar un producto (soft delete - marca como inactivo).

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `DELETE` |
| **URL** | `http://localhost:3000/api/products/1` |
| **Headers** | `Authorization: Bearer <token>` |

**Response (200):**
```json
{
  "message": "Producto eliminado"
}
```

---

### `PATCH /products/:id/stock` (Solo ADMIN)
Ajustar el stock de un producto.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `PATCH` |
| **URL** | `http://localhost:3000/api/products/1/stock` |
| **Headers** | `Authorization: Bearer <token>` |
| | `Content-Type: application/json` |

**Body (JSON):**
```json
{
  "type": "ENTRADA",
  "quantity": 10,
  "note": "Compra de nueva mercadería"
}
```

**Tipos válidos:** `ENTRADA`, `SALIDA`, `AJUSTE`, `DEVOLUCION`

**Response (200):**
```json
{
  "id": 1,
  "stockCurrent": 35,
  "movement": {
    "id": 150,
    "type": "ENTRADA",
    "quantity": 10,
    "note": "Compra de nueva mercadería",
    "createdAt": "2024-05-16T11:30:00Z"
  }
}
```

---

### `POST /products/:id/items` (Solo ADMIN)
Agregar números de serie a un producto.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `POST` |
| **URL** | `http://localhost:3000/api/products/5/items` |
| **Headers** | `Authorization: Bearer <token>` |
| | `Content-Type: application/json` |

**Body (JSON):**
```json
{
  "serials": ["SN001", "SN002", "SN003"]
}
```

**Response (201):**
```json
{
  "message": "3 números de serie agregados",
  "count": 3
}
```

---

## 📂 Categorías (Protected - Requiere autenticación)

### `GET /categories`
Listar todas las categorías.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `GET` |
| **URL** | `http://localhost:3000/api/categories` |
| **Headers** | `Authorization: Bearer <token>` |

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Periféricos",
      "description": "Teclados, mouses, headsets"
    },
    {
      "id": 2,
      "name": "Monitores",
      "description": "Pantallas para PC"
    }
  ]
}
```

---

### `POST /categories` (Solo ADMIN)
Crear una nueva categoría.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `POST` |
| **URL** | `http://localhost:3000/api/categories` |
| **Headers** | `Authorization: Bearer <token>` |
| | `Content-Type: application/json` |

**Body (JSON):**
```json
{
  "name": "Sillas Gaming",
  "description": "Sillas ergonómicas para gaming"
}
```

**Response (201):**
```json
{
  "id": 3,
  "name": "Sillas Gaming",
  "description": "Sillas ergonómicas para gaming"
}
```

---

### `PUT /categories/:id` (Solo ADMIN)
Actualizar una categoría.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `PUT` |
| **URL** | `http://localhost:3000/api/categories/1` |
| **Headers** | `Authorization: Bearer <token>` |
| | `Content-Type: application/json` |

**Body (JSON):**
```json
{
  "name": "Accesorios PC",
  "description": "Todos los accesorios para computadora"
}
```

**Response (200):**
```json
{
  "id": 1,
  "name": "Accesorios PC",
  "description": "Todos los accesorios para computadora"
}
```

---

### `DELETE /categories/:id` (Solo ADMIN)
Eliminar una categoría.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `DELETE` |
| **URL** | `http://localhost:3000/api/categories/1` |
| **Headers** | `Authorization: Bearer <token>` |

**Response (200):**
```json
{
  "message": "Categoría eliminada"
}
```

---

## 👥 Clientes (Protected - Requiere autenticación)

### `GET /customers`
Listar todos los clientes con paginación.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `GET` |
| **URL** | `http://localhost:3000/api/customers?page=1&limit=20` |
| **Headers** | `Authorization: Bearer <token>` |

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "nombre": "Juan Pérez García",
      "tipoDocumento": "DNI",
      "nroDocumento": "12345678",
      "email": "juan@email.com",
      "telefono": "987654321",
      "direccion": "Av. Principal 123, Lima",
      "isActive": true,
      "createdAt": "2024-05-16T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

---

### `GET /customers/:id`
Obtener detalles de un cliente.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `GET` |
| **URL** | `http://localhost:3000/api/customers/1` |
| **Headers** | `Authorization: Bearer <token>` |

**Response (200):**
```json
{
  "id": 1,
  "nombre": "Juan Pérez García",
  "tipoDocumento": "DNI",
  "nroDocumento": "12345678",
  "email": "juan@email.com",
  "telefono": "987654321",
  "direccion": "Av. Principal 123, Lima",
  "isActive": true,
  "createdAt": "2024-05-16T10:00:00Z"
}
```

---

### `POST /customers`
Crear un nuevo cliente con validación automática contra SUNAT.

> **⚠️ IMPORTANTE:** Si proporcionas un DNI (8 dígitos) o RUC (11 dígitos), el sistema consultará automáticamente la base de datos del SUNAT a través de la API Perú para validar y extraer los datos reales del cliente. El documento **DEBE ser válido en SUNAT**.

**Validación automática:**
- **DNI (8 dígitos):** Se consulta SUNAT y se extraen nombres y apellidos reales
- **RUC (11 dígitos):** Se consulta SUNAT y se extrae razón social y dirección real
- Si el documento no existe en SUNAT, se devuelve error `400`
- Si el cliente ya existe en la BD con ese documento, se devuelve el cliente existente

**Campos del body:**
| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `nombre` | string | ✅ | Nombre (se ignora si proporcionas DNI/RUC real) |
| `tipoDocumento` | string | ❌ | Tipo: `DNI`, `RUC`, `CE`, `PASAPORTE`, `SIN_DOC` |
| `nroDocumento` | string | ❌ | DNI (8 dígitos) o RUC (11 dígitos) **REAL** |
| `email` | string | ❌ | Correo electrónico |
| `telefono` | string | ❌ | Teléfono |
| `direccion` | string | ❌ | Dirección (se completa automáticamente para RUC) |

**En Postman - Ejemplo 1: Con DNI real (se valida en SUNAT)**

| Campo | Valor |
|---|---|
| **Método** | `POST` |
| **URL** | `http://localhost:3000/api/customers` |
| **Headers** | `Authorization: Bearer <token>` |
| | `Content-Type: application/json` |

**Body (JSON):**
```json
{
  "tipoDocumento": "DNI",
  "nroDocumento": "12345678",
  "email": "juan@email.com",
  "telefono": "987654321"
}
```

**En Postman - Ejemplo 2: Con RUC real (se valida en SUNAT)**

| Campo | Valor |
|---|---|
| **Método** | `POST` |
| **URL** | `http://localhost:3000/api/customers` |
| **Headers** | `Authorization: Bearer <token>` |
| | `Content-Type: application/json` |

**Body (JSON):**
```json
{
  "tipoDocumento": "RUC",
  "nroDocumento": "20123456789",
  "email": "empresa@empresa.com",
  "telefono": "014459999"
}
```

**En Postman - Ejemplo 3: Sin documento (solo nombre)**

| Campo | Valor |
|---|---|
| **Método** | `POST` |
| **URL** | `http://localhost:3000/api/customers` |
| **Headers** | `Authorization: Bearer <token>` |
| | `Content-Type: application/json` |

**Body (JSON):**
```json
{
  "nombre": "Cliente sin documento",
  "tipoDocumento": "SIN_DOC",
  "email": "cliente@email.com"
}
```

**Response (201) - Con DNI validado:**
```json
{
  "id": 2,
  "nombre": "Juan Carlos Pérez López",
  "tipoDocumento": "DNI",
  "nroDocumento": "12345678",
  "email": "juan@email.com",
  "telefono": "987654321",
  "direccion": null,
  "isActive": true,
  "createdAt": "2024-05-16T11:15:00Z"
}
```

**Response (201) - Con RUC validado:**
```json
{
  "id": 3,
  "nombre": "Empresa Comercial S.A.C.",
  "tipoDocumento": "RUC",
  "nroDocumento": "20123456789",
  "email": "empresa@empresa.com",
  "telefono": "014459999",
  "direccion": "Av. Comercio 123, Lima 01, Perú",
  "isActive": true,
  "createdAt": "2024-05-16T11:20:00Z"
}
```

**Errores posibles:**
- `400` - DNI 12345678 no encontrado en SUNAT (documento inválido o inexistente)
- `400` - RUC 20123456789 no encontrado en SUNAT
- `400` - Documento inválido: debe tener 8 (DNI) o 11 (RUC) dígitos
- `400` - Documento inválido: debe contener solo números
- `400` - nombre es obligatorio (solo si no proporcionas nombre ni documento)

**Notas técnicas:**
- El sistema usa la **API Perú** para validar documentos contra el SUNAT
- Requiere que `API_PERU_TOKEN` esté configurado en `.env`
- Los datos extraídos del SUNAT se guardan automáticamente en la BD
- Si llamas de nuevo con el mismo documento, devuelve el cliente ya registrado (no crea duplicados)

---

### `PUT /customers/:id`
Actualizar datos de un cliente.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `PUT` |
| **URL** | `http://localhost:3000/api/customers/1` |
| **Headers** | `Authorization: Bearer <token>` |
| | `Content-Type: application/json` |

**Body (JSON):**
```json
{
  "email": "juannuevo@email.com",
  "telefono": "989999999"
}
```

**Response (200):**
```json
{
  "id": 1,
  "nombre": "Juan Pérez García",
  "tipoDocumento": "DNI",
  "nroDocumento": "12345678",
  "email": "juannuevo@email.com",
  "telefono": "989999999",
  "direccion": "Av. Principal 123, Lima",
  "isActive": true,
  "createdAt": "2024-05-16T10:00:00Z"
}
```

---

### `DELETE /customers/:id` (Solo ADMIN)
Eliminar un cliente (soft delete).

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `DELETE` |
| **URL** | `http://localhost:3000/api/customers/1` |
| **Headers** | `Authorization: Bearer <token>` |

**Response (200):**
```json
{
  "message": "Cliente eliminado"
}
```

---

## 💰 Ventas (Protected - Requiere autenticación)

### `GET /sales`
Listar todas las ventas con filtros y paginación.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `GET` |
| **URL** | `http://localhost:3000/api/sales?page=1&limit=20&from=2024-05-01` |
| **Headers** | `Authorization: Bearer <token>` |

**Query Parameters opcionales:**
```
?page=1&limit=20&userId=1&customerId=5&from=2024-05-01&to=2024-05-31
```

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "userId": 1,
      "customerId": 3,
      "subtotal": "500.00",
      "descuento": "50.00",
      "total": "450.00",
      "status": "COMPLETADA",
      "createdAt": "2024-05-16T14:30:00Z",
      "user": {
        "id": 1,
        "username": "admin",
        "email": "admin@pos.com"
      },
      "customer": {
        "id": 3,
        "nombre": "Cliente A",
        "nroDocumento": "12345678"
      },
      "items": [
        {
          "id": 1,
          "productId": 1,
          "nombreSnapshot": "Teclado Gamer RGB",
          "precioSnapshot": "150.00",
          "quantity": 2,
          "descuento": "30.00",
          "subtotal": "270.00"
        },
        {
          "id": 2,
          "productId": 2,
          "nombreSnapshot": "Mouse Gamer",
          "precioSnapshot": "85.00",
          "quantity": 1,
          "descuento": "20.00",
          "subtotal": "65.00"
        }
      ],
      "payments": [
        {
          "id": 1,
          "paymentMethodId": 1,
          "paymentMethod": { "name": "Efectivo" },
          "amount": "300.00"
        },
        {
          "id": 2,
          "paymentMethodId": 3,
          "paymentMethod": { "name": "Yape" },
          "amount": "150.00"
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 156
  }
}
```

---

### `GET /sales/:id`
Obtener detalles completos de una venta.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `GET` |
| **URL** | `http://localhost:3000/api/sales/1` |
| **Headers** | `Authorization: Bearer <token>` |

**Response (200):**
```json
{
  "id": 1,
  "userId": 1,
  "customerId": 3,
  "subtotal": "500.00",
  "descuento": "50.00",
  "total": "450.00",
  "status": "COMPLETADA",
  "createdAt": "2024-05-16T14:30:00Z",
  "user": { ... },
  "customer": { ... },
  "items": [ ... ],
  "payments": [ ... ]
}
```

---

### `POST /sales`
Crear una nueva venta. **Este es el endpoint más importante del sistema.**

**Tipos de comprobante:** `FACTURA` o `BOLETA`

**Validaciones importantes:**
- `FACTURA` **requiere** RUC de 11 dígitos
- `BOLETA` acepta DNI (8 dígitos) o RUC (11 dígitos), opcional
- Items no puede estar vacío
- Payments no puede estar vacío
- La suma de payments debe ser igual a total

**En Postman - Ejemplo 1: Venta simple (Boleta sin cliente)**

| Campo | Valor |
|---|---|
| **Método** | `POST` |
| **URL** | `http://localhost:3000/api/sales` |
| **Headers** | `Authorization: Bearer <token>` |
| | `Content-Type: application/json` |

**Body (JSON):**
```json
{
  "tipoComprobante": "BOLETA",
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "descuento": 0
    }
  ],
  "payments": [
    {
      "paymentMethodId": 1,
      "amount": 300
    }
  ]
}
```

**En Postman - Ejemplo 2: Factura con cliente RUC**

| Campo | Valor |
|---|---|
| **Método** | `POST` |
| **URL** | `http://localhost:3000/api/sales` |
| **Headers** | `Authorization: Bearer <token>` |
| | `Content-Type: application/json` |

**Body (JSON):**
```json
{
  "tipoComprobante": "FACTURA",
  "documentoCliente": "20123456789",
  "customerId": 5,
  "items": [
    {
      "productId": 1,
      "quantity": 1,
      "descuento": 50
    },
    {
      "productId": 2,
      "quantity": 3,
      "descuento": 0
    }
  ],
  "payments": [
    {
      "paymentMethodId": 1,
      "amount": 150
    },
    {
      "paymentMethodId": 3,
      "amount": 265
    }
  ],
  "descuento": 20
}
```

**Response (201):**
```json
{
  "id": 2,
  "userId": 1,
  "customerId": 3,
  "subtotal": "300.00",
  "descuento": "0.00",
  "total": "300.00",
  "status": "COMPLETADA",
  "createdAt": "2024-05-16T15:00:00Z",
  "items": [
    {
      "id": 3,
      "saleId": 2,
      "productId": 1,
      "nombreSnapshot": "Teclado Gamer RGB",
      "precioSnapshot": "150.00",
      "quantity": 2,
      "descuento": "0.00",
      "subtotal": "300.00"
    }
  ],
  "payments": [
    {
      "id": 3,
      "saleId": 2,
      "paymentMethodId": 1,
      "amount": "300.00",
      "paymentMethod": {
        "id": 1,
        "name": "Efectivo"
      }
    }
  ]
}
```

**Errores posibles:**
- `400` - tipoComprobante es obligatorio
- `400` - Factura requiere RUC del cliente
- `400` - Factura requiere RUC válido de 11 dígitos
- `400` - items debe ser un array no vacío
- `400` - payments debe ser un array no vacío
- `400` - La suma de payments no coincide con el total

---

### `GET /sales/:id/sunat-status`
Obtener el estado de un documento en SUNAT.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `GET` |
| **URL** | `http://localhost:3000/api/sales/1/sunat-status` |
| **Headers** | `Authorization: Bearer <token>` |

**Response (200):**
```json
{
  "id": 1,
  "statusSUNAT": "ACEPTADO",
  "ticketId": "000138-20240516-1",
  "serie": "F001",
  "correlativo": "000138",
  "cdrUrl": "https://example.com/cdr.xml"
}
```

---

### `GET /sales/:id/pdf`
Descargar el PDF del comprobante (SUNAT).

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `GET` |
| **URL** | `http://localhost:3000/api/sales/1/pdf` |
| **Headers** | `Authorization: Bearer <token>` |

La respuesta será un archivo PDF descargable.

---

### `PATCH /sales/:id/anular`
Anular una venta completada y devolver el stock.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `PATCH` |
| **URL** | `http://localhost:3000/api/sales/1/anular` |
| **Headers** | `Authorization: Bearer <token>` |
| | `Content-Type: application/json` |

**Body (JSON):**
```json
{
  "razon": "Venta cancelada por error del cliente"
}
```

**Response (200):**
```json
{
  "id": 1,
  "status": "ANULADA",
  "message": "Venta anulada correctamente. Stock devuelto.",
  "stockRestored": [
    { "productId": 1, "quantity": 2 },
    { "productId": 2, "quantity": 1 }
  ]
}
```

**Efectos de anular:**
- Cambia status a `ANULADA`
- Devuelve stock de todos los items
- Crea movimientos de tipo `DEVOLUCION`
- Genera notificación

---

### `POST /sales/:id/retry-sunat`
Reintentar envío a SUNAT de un comprobante que falló.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `POST` |
| **URL** | `http://localhost:3000/api/sales/1/retry-sunat` |
| **Headers** | `Authorization: Bearer <token>` |

**Response (200):**
```json
{
  "message": "Reintentando envío a SUNAT...",
  "statusSUNAT": "ENVIADO"
}
```

---

## 👨‍💼 Usuarios (Protected - Solo ADMIN)

### `GET /users`
Listar todos los usuarios del sistema.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `GET` |
| **URL** | `http://localhost:3000/api/users?page=1&limit=20` |
| **Headers** | `Authorization: Bearer <token>` |

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@pos.com",
      "role": { "id": 1, "name": "ADMIN" },
      "isActive": true,
      "createdAt": "2024-05-16T10:00:00Z"
    },
    {
      "id": 2,
      "username": "vendedor1",
      "email": "vendedor1@pos.com",
      "role": { "id": 2, "name": "VENDEDOR" },
      "isActive": true,
      "createdAt": "2024-05-16T10:05:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

---

### `POST /users` (Solo ADMIN)
Crear un nuevo usuario.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `POST` |
| **URL** | `http://localhost:3000/api/users` |
| **Headers** | `Authorization: Bearer <token>` |
| | `Content-Type: application/json` |

**Body (JSON):**
```json
{
  "username": "vendedor2",
  "email": "vendedor2@pos.com",
  "password": "vendedor123",
  "roleId": 2
}
```

**Response (201):**
```json
{
  "id": 3,
  "username": "vendedor2",
  "email": "vendedor2@pos.com",
  "roleId": 2,
  "isActive": true,
  "createdAt": "2024-05-16T11:30:00Z"
}
```

---

### `PUT /users/:id` (Solo ADMIN)
Actualizar datos de un usuario.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `PUT` |
| **URL** | `http://localhost:3000/api/users/2` |
| **Headers** | `Authorization: Bearer <token>` |
| | `Content-Type: application/json` |

**Body (JSON):**
```json
{
  "email": "vendedor_nuevo@pos.com",
  "roleId": 1
}
```

**Response (200):**
```json
{
  "id": 2,
  "username": "vendedor1",
  "email": "vendedor_nuevo@pos.com",
  "roleId": 1,
  "isActive": true,
  "createdAt": "2024-05-16T10:05:00Z"
}
```

---

### `PATCH /users/:id/toggle` (Solo ADMIN)
Activar o desactivar un usuario.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `PATCH` |
| **URL** | `http://localhost:3000/api/users/2/toggle` |
| **Headers** | `Authorization: Bearer <token>` |

**Response (200):**
```json
{
  "id": 2,
  "username": "vendedor1",
  "email": "vendedor1@pos.com",
  "isActive": false,
  "message": "Usuario desactivado"
}
```

---

## 🔔 Notificaciones (Protected - Requiere autenticación)

### `GET /notifications`
Listar notificaciones no leídas.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `GET` |
| **URL** | `http://localhost:3000/api/notifications` |
| **Headers** | `Authorization: Bearer <token>` |

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "type": "STOCK_MINIMO",
      "message": "Stock bajo: Teclado Gamer RGB tiene solo 3 unidades",
      "referenceId": 1,
      "isRead": false,
      "createdAt": "2024-05-16T12:00:00Z"
    },
    {
      "id": 2,
      "type": "VENTA_ANULADA",
      "message": "La venta #1 fue anulada por el usuario Admin",
      "referenceId": 1,
      "isRead": false,
      "createdAt": "2024-05-16T12:15:00Z"
    }
  ]
}
```

---

### `PATCH /notifications/:id/read`
Marcar una notificación como leída.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `PATCH` |
| **URL** | `http://localhost:3000/api/notifications/1/read` |
| **Headers** | `Authorization: Bearer <token>` |

**Response (200):**
```json
{
  "id": 1,
  "isRead": true,
  "message": "Notificación marcada como leída"
}
```

---

### `PATCH /notifications/read-all`
Marcar todas las notificaciones como leídas.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `PATCH` |
| **URL** | `http://localhost:3000/api/notifications/read-all` |
| **Headers** | `Authorization: Bearer <token>` |

**Response (200):**
```json
{
  "count": 5,
  "message": "5 notificaciones marcadas como leídas"
}
```

---

## 🏥 Health Check (Public)

### `GET /health`
Verificar que el servidor está activo.

**En Postman:**

| Campo | Valor |
|---|---|
| **Método** | `GET` |
| **URL** | `http://localhost:3000/api/health` |

**Response (200):**
```json
{
  "ok": true,
  "name": "Eagle Gaming POS API"
}
```

---

## 🗂️ Estructura del proyecto

```
Sistema-POS-Backend/
├── prisma/
│   ├── schema.prisma                      # Definición de modelos Prisma
│   ├── migrations/                        # Historial de cambios de BD
│   │   ├── 20260505181033_init_firme/
│   │   ├── 20260513062251_add_sunat_support/
│   │   ├── 20260516085457_add_sunat_support_v2/
│   │   └── 20260516101939_add_sunat_support_v2_1/
│   └── seed.js                            # Datos iniciales
│
├── src/
│   ├── app.js                             # Punto de entrada
│   ├── controllers/                       # Lógica de negocio
│   │   ├── auth.controller.js             # Login
│   │   ├── categories.controller.js       # CRUD categorías
│   │   ├── customers.controller.js        # CRUD clientes
│   │   ├── notifications.controller.js    # Gestión notificaciones
│   │   ├── products.controller.js         # CRUD productos + stock
│   │   ├── sales.controller.js            # Ventas + SUNAT
│   │   └── users.controller.js            # CRUD usuarios
│   │
│   ├── routes/                            # Definición endpoints
│   │   ├── auth.routes.js
│   │   ├── categories.routes.js
│   │   ├── customers.routes.js
│   │   ├── notifications.routes.js
│   │   ├── products.routes.js
│   │   ├── sales.routes.js
│   │   └── users.routes.js
│   │
│   ├── middlewares/                       # Filtros de peticiones
│   │   ├── auth.middleware.js             # Verifica JWT
│   │   └── role.middleware.js             # Verifica permisos
│   │
│   ├── helpers/                           # Utilidades reutilizables
│   │   ├── jwt.helper.js                  # Generar/verificar tokens
│   │   └── pagination.helper.js           # Lógica paginación
│   │
│   ├── libs/                              # Librerías
│   │   └── prisma.js                      # Cliente Prisma
│   │
│   ├── services/                          # Lógica de negocio compleja
│   │   ├── auth.service.js                # Autenticación
│   │   ├── apiperu.service.js             # Lookup de documentos
│   │   ├── apisunat.service.js            # Integración SUNAT
│   │   ├── categories.service.js
│   │   ├── customers.service.js
│   │   ├── customerLookup.service.js
│   │   ├── electronicDocument.service.js  # Documentos electrónicos
│   │   ├── enviarComprobante.service.js
│   │   ├── notifications.service.js
│   │   ├── products.service.js
│   │   ├── sales.service.js
│   │   ├── syncSunatStatus.service.js     # Sincronización SUNAT (CRON)
│   │   └── users.service.js
│   │
│   └── utils/                             # Funciones auxiliares
│       ├── calcularTotalesVenta.js
│       ├── generarComprobanteJson.js
│       ├── generarSerieCorrelativo.js
│       └── NumeroALetras.js
│
├── .env                                   # Variables de entorno
├── .gitignore
├── package.json
├── package-lock.json
├── prisma.config.ts
├── README.md
└── TESTING_GUIDE.md
```

---

## Base de datos

### Tablas principales

| Tabla | Descripción | Registros típicos |
|---|---|---|
| `roles` | Tipos de usuario (ADMIN, VENDEDOR) | 2 |
| `users` | Usuarios del sistema | 5-10 |
| `categories` | Categorías de productos | 10-20 |
| `products` | Catálogo de productos | 100-1000 |
| `customers` | Clientes registrados | 50-500 |
| `sales` | Historial de ventas | Aumenta con el tiempo |
| `sale_items` | Detalle de items por venta | Múltiple por venta |
| `payment_methods` | Métodos de pago (Efectivo, Tarjeta, Yape) | 5 |
| `sale_payments` | Pagos de ventas | Múltiple por venta |
| `stock_movements` | Historial de cambios de stock | Aumenta con el tiempo |
| `notifications` | Alertas del sistema | Aumenta con el tiempo |
| `audit_log` | Auditoría de acciones | Aumenta con el tiempo |

### Relaciones principales

```
Role ──────────────── User ──────────────── Sale ──────── SaleItem ──── Product
                       │                     │                               │
                       │                     ├──── SalePayment              ├── Category
                       │                     │           │                  └── StockMovement
                       │                     └──── Customer
                       │
                       └──── AuditLog
```

---

## 🔐 Autenticación

### Cómo funciona

1. **Login:** El usuario envía email + password a `POST /api/auth/login`
2. **Verificación:** El servidor compara la contraseña (encriptada con bcrypt)
3. **Token JWT:** Si es correcto, se devuelve un token JWT con el usuario y su rol
4. **Peticiones protegidas:** El cliente envía el token en el header `Authorization: Bearer <token>`
5. **Validación:** El servidor verifica que el token sea válido

### Estructura del JWT

```json
{
  "sub": "1",
  "role": "ADMIN",
  "iat": 1716129600,
  "exp": 1716734400
}
```

- `sub`: ID del usuario
- `role`: Rol del usuario (ADMIN o VENDEDOR)
- `iat`: Fecha de emisión
- `exp`: Fecha de expiración (7 días)

### Usar el token

```bash
# 1. Obtener el token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pos.com",
    "password": "admin123"
  }' \
  | jq -r '.token' > token.txt

# 2. Usar el token en peticiones protegidas
TOKEN=$(cat token.txt)

curl -X GET http://localhost:3000/api/products \
  -H "Authorization: Bearer $TOKEN"
```

### Roles y permisos

| Endpoint | ADMIN | VENDEDOR | Public |
|---|---|---|---|
| POST /auth/login | ✅ | ✅ | ✅ |
| GET /health | ✅ | ✅ | ✅ |
| GET /products | ✅ | ✅ | ❌ |
| POST /products | ✅ | ❌ | ❌ |
| PUT /products | ✅ | ❌ | ❌ |
| DELETE /products | ✅ | ❌ | ❌ |
| PATCH /products/:id/stock | ✅ | ❌ | ❌ |
| POST /customers | ✅ | ✅ | ❌ |
| GET /customers | ✅ | ✅ | ❌ |
| POST /sales | ✅ | ✅ | ❌ |
| PATCH /sales/:id/anular | ✅ | ✅ | ❌ |
| GET /users | ✅ | ❌ | ❌ |
| POST /users | ✅ | ❌ | ❌ |

---

## 🔍 Validación de Documentos SUNAT

El sistema integra la **API Perú** para validar documentos en tiempo real contra la base de datos del SUNAT. Esta funcionalidad permite crear clientes con información verificada automáticamente.

### Cómo funciona

**Cuando creas un cliente con DNI o RUC:**

```
1. Frontend envía: POST /api/customers con nroDocumento
        ↓
2. Backend valida formato (8 o 11 dígitos)
        ↓
3. Backend consulta la BD local
   ¿Cliente ya existe?
        ↓ SI → Devuelve cliente existente
        ↓ NO ↓
4. Backend consulta API Perú → SUNAT
        ↓
5. API Perú verifica en la base de datos del SUNAT
        ↓
6. Si es válido → Extrae datos reales:
   • DNI: nombres, apellidos, nombre completo
   • RUC: razón social, dirección
        ↓
7. Crea cliente automáticamente con datos SUNAT
        ↓
8. Devuelve cliente creado con datos reales
```

### Validaciones

| Validación | DNI | RUC |
|---|---|---|
| Longitud | 8 dígitos | 11 dígitos |
| Formato | Solo números | Solo números |
| Existencia en SUNAT | ✅ Validado | ✅ Validado |
| Datos extraídos | Nombres, apellidos | Razón social, dirección |
| Si no existe | Error 400 | Error 400 |

### Ejemplo: Crear cliente con DNI real

```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tipoDocumento": "DNI",
    "nroDocumento": "12345678"
  }'
```

**Proceso:**
1. Backend valida que sea 8 dígitos ✅
2. Backend consulta SUNAT a través de API Perú
3. SUNAT devuelve: "Juan Carlos Pérez García"
4. Sistema crea cliente con ese nombre automáticamente

**Response:**
```json
{
  "id": 5,
  "nombre": "Juan Carlos Pérez García",
  "tipoDocumento": "DNI",
  "nroDocumento": "12345678",
  "email": null,
  "telefono": null,
  "direccion": null,
  "isActive": true,
  "createdAt": "2024-05-16T15:30:00Z"
}
```

### Ejemplo: Crear cliente con RUC real

```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tipoDocumento": "RUC",
    "nroDocumento": "20123456789"
  }'
```

**Proceso:**
1. Backend valida que sea 11 dígitos ✅
2. Backend consulta SUNAT a través de API Perú
3. SUNAT devuelve: "Empresa Comercial S.A.C.", "Av. Comercio 123"
4. Sistema crea cliente con esos datos automáticamente

**Response:**
```json
{
  "id": 6,
  "nombre": "Empresa Comercial S.A.C.",
  "tipoDocumento": "RUC",
  "nroDocumento": "20123456789",
  "email": null,
  "telefono": null,
  "direccion": "Av. Comercio 123, Lima 01, Perú",
  "isActive": true,
  "createdAt": "2024-05-16T15:35:00Z"
}
```

### Flujo cuando el documento no existe en SUNAT

```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tipoDocumento": "DNI",
    "nroDocumento": "00000000"
  }'
```

**Response (400):**
```json
{
  "message": "DNI 00000000 no encontrado en SUNAT"
}
```

### Importante

⚠️ **Los documentos deben ser REALES y estar registrados en SUNAT.**

Esto es por diseño para garantizar que:
- ✅ La información del cliente es correcta
- ✅ No hay datos duplicados o falsos
- ✅ La facturación electrónica SUNAT funciona correctamente
- ✅ Se cumple la normativa tributaria peruana

**Alternativa:** Si quieres crear un cliente sin validar contra SUNAT, usa `tipoDocumento: "SIN_DOC"` y pasa el `nombre` manualmente.

---

## 📚 Ejemplos de uso

### Flujo completo: Vendedor vende 2 productos con múltiples pagos

**Paso 1: Login**
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vendedor1@pos.com",
    "password": "vendedor123"
  }' | jq -r '.token')

echo "Token obtenido: $TOKEN"
```

**Paso 2: Consultar productos disponibles**
```bash
curl -X GET http://localhost:3000/api/products \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | {id, name, price, stockCurrent}'
```

**Paso 3: Buscar o crear cliente (con validación SUNAT)**
```bash
# El sistema valida automáticamente contra SUNAT si proporcionas DNI o RUC real
# Ejemplo con DNI (8 dígitos):
CUSTOMER_ID=$(curl -s -X POST http://localhost:3000/api/customers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipoDocumento": "DNI",
    "nroDocumento": "12345678",
    "email": "cliente@email.com",
    "telefono": "987654321"
  }' | jq -r '.id')

echo "Cliente creado/encontrado: $CUSTOMER_ID"

# ⚠️ El DNI/RUC debe ser REAL y estar registrado en SUNAT
# Si es inválido, devuelve error 400
```

**Paso 4: Crear venta**
```bash
curl -X POST http://localhost:3000/api/sales \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipoComprobante": "BOLETA",
    "customerId": 1,
    "items": [
      {
        "productId": 1,
        "quantity": 2,
        "descuento": 10
      },
      {
        "productId": 2,
        "quantity": 1,
        "descuento": 0
      }
    ],
    "payments": [
      {
        "paymentMethodId": 1,
        "amount": 150
      },
      {
        "paymentMethodId": 3,
        "amount": 100
      }
    ]
  }' | jq '.id'
```

**Paso 5: Consultar la venta**
```bash
SALE_ID=1
curl -X GET http://localhost:3000/api/sales/$SALE_ID \
  -H "Authorization: Bearer $TOKEN" | jq '{id, total, status, items: (.items | length), payments: (.payments | length)}'
```

**Paso 6: Anular la venta (si es necesario)**
```bash
curl -X PATCH http://localhost:3000/api/sales/$SALE_ID/anular \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"razon": "Cliente cambió de opinión"}'
```

---

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# === BASE DE DATOS ===
# PostgreSQL conexión
DATABASE_URL="postgresql://postgres:admin123@localhost:5432/eagle_pos?schema=public"

# === SEGURIDAD ===
# Clave secreta para firmar JWT (cambiar en producción)
JWT_SECRET="eagle_gaming_pos_secret_key_2024"

# === SERVIDOR ===
# Puerto donde corre el servidor
PORT=3000

# CORS - Origen permitido para solicitudes
CORS_ORIGIN=true  # true para desarrollo (permite cualquier origen), específica la URL en producción

# === API PERÚ (Validación de documentos SUNAT) ===
# Token para validar DNI y RUC en tiempo real contra SUNAT
API_PERU_TOKEN="tu_token_api_peru"

# === SUNAT (Opcional) ===
# URLs de integración con SUNAT
SUNAT_API_URL="https://api.sunat.gob.pe"
SUNAT_USERNAME="usuario_sunat"
SUNAT_PASSWORD="password_sunat"
```

### Explicación de variables

| Variable | Descripción | Ejemplo | Producción | Requerida |
|---|---|---|---|---|
| `DATABASE_URL` | URL conexión PostgreSQL | `postgresql://user:pass@host:5432/db` | URL real de BD | ✅ |
| `JWT_SECRET` | Clave para firmar tokens | Mínimo 32 caracteres | **Generar nueva clave** | ✅ |
| `PORT` | Puerto del servidor | `3000` | `443` (HTTPS) o `3000` | ✅ |
| `CORS_ORIGIN` | CORS permitido | `true` (desarrollo) | URL del frontend | ✅ |
| `API_PERU_TOKEN` | Token API Perú para SUNAT | (obtener en apiperu.dev) | Token de producción | ✅ |
| `SUNAT_*` | Credenciales SUNAT | (si tienes acceso) | Credenciales reales | ❌ |

### Obtener API_PERU_TOKEN

1. Ir a https://apiperu.dev/
2. Registrarse o iniciar sesión
3. Crear un token API
4. Copiar el token en la variable `API_PERU_TOKEN`

**Función:** Valida DNI y RUC en tiempo real contra la base de datos del SUNAT. Sin esto, el sistema no puede crear clientes con documentos validados.

### Generar JWT_SECRET seguro

```bash
# Linux/Mac
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Windows PowerShell
[Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

---

## 🛠️ Scripts npm

```bash
# Desarrollo (con hot-reload)
npm run dev

# Producción
npm start

# Generar cliente Prisma (después de cambios en schema.prisma)
npm run prisma:generate

# Sincronizar BD (aplicar migraciones)
npm run prisma:push

# Cargar datos iniciales
npm run seed

# Tests (cuando estén configurados)
npm test
```

---

## 📋 Checklist para usar la API

- [ ] PostgreSQL está corriendo (local o Docker)
- [ ] `.env` está configurado correctamente
- [ ] `npm install` ejecutado
- [ ] `npx prisma migrate dev` ejecutado
- [ ] `node prisma/seed.js` ejecutado
- [ ] `npm run dev` sin errores
- [ ] Puedo acceder a `http://localhost:3000/api/health`
- [ ] Puedo hacer login con `admin@pos.com` / `admin123`
- [ ] Puedo consultar productos: `GET /api/products` con token

---

## 🐛 Troubleshooting

### Error: "connect ECONNREFUSED 127.0.0.1:5432"
PostgreSQL no está corriendo.
```bash
# Si usas Docker
docker start eagle-pos-db

# Si usas PostgreSQL local
# Asegúrate de que el servicio esté iniciado
```

### Error: "P1012 - Prisma schema validation error"
Hay un error en `schema.prisma`. Revisa la sintaxis.

### Error: "TokenExpiredError"
El JWT ha expirado. Haz login de nuevo.

### Error: "Unauthorized"
El token no es válido o no fue enviado en el header `Authorization`.

---

## 📞 Soporte

Para reportar bugs o sugerencias, abre un issue en: https://github.com/Sebaztian-Hane/Sistema-POS-Backend/issues

---

## 📄 Licencia

ISC

---

**Versión:** 1.0.0  
**Última actualización:** Mayo 16, 2024  
**Desarrollado por:** Sebastian Hane
