# 🧪 Guía de Pruebas (API Testing Guide) - Eagle Gaming POS

Esta guía detalla cómo probar los endpoints principales del sistema utilizando herramientas como Postman o Thunder Client.

---

## 🔐 1. Autenticación (El primer paso)
Antes de probar cualquier ruta protegida, debes obtener tu **Token JWT**.

- **Método:** `POST`
- **URL:** `http://localhost:3000/api/auth/login`
- **Body (JSON):**
```json
{
  "email": "admin@eaglegaming.com",
  "password": "admin123"
}
```
- **Acción:** Copia el campo `token` de la respuesta y pégalo en la pestaña **Authorization -> Bearer Token** de tus siguientes peticiones.

---

## 📦 2. Gestión de Productos y Stock

### A. Ver detalle de un producto (con seriales)
- **Método:** `GET`
- **URL:** `http://localhost:3000/api/products/1`
- **Resultado esperado:** Verás los datos de la Laptop y el array `items` con sus números de serie disponibles.

### B. Agregar nuevos Seriales (Scan Simulation)
- **Método:** `POST`
- **URL:** `http://localhost:3000/api/products/1/items`
- **Body (JSON):**
```json
{
  "serialNumbers": ["EAGLE-SN-001", "EAGLE-SN-002"],
  "note": "Ingreso de mercadería nueva por aduana"
}
```

### C. Ajustar stock normal (No serializados)
- **Método:** `PATCH`
- **URL:** `http://localhost:3000/api/products/20/stock`
- **Body (JSON):**
```json
{
  "delta": 10,
  "type": "ENTRADA",
  "note": "Ajuste por inventario físico"
}
```

---

## 💰 3. Ventas y Facturación

### A. Crear una Venta Mixta
- **Método:** `POST`
- **URL:** `http://localhost:3000/api/sales`
- **Body (JSON):**
```json
{
  "customerId": 1,
  "items": [
    { "productId": 20, "quantity": 1, "descuento": 0 },
    { "productId": 1, "quantity": 1, "descuento": 0, "serialNumbers": ["EAGLE-SN-001"] }
  ],
  "payments": [
    { "paymentMethodId": 1, "amount": 4399.98 }
  ]
}
```

### B. Ver Historial de un Cliente específico
- **Método:** `GET`
- **URL:** `http://localhost:3000/api/sales?customerId=1`

### C. Anular una Venta (Devolución total)
- **Método:** `PATCH`
- **URL:** `http://localhost:3000/api/sales/ID_DE_VENTA/anular`

---

## 👥 4. Clientes y Usuarios

### A. Registrar un nuevo Cliente
- **Método:** `POST`
- **URL:** `http://localhost:3000/api/customers`
- **Body (JSON):**
```json
{
  "nombre": "Eagle Gaming SAC",
  "tipoDocumento": "RUC",
  "nroDocumento": "20601234567",
  "email": "ventas@eagle.com"
}
```

### B. Crear un nuevo empleado (Cajero)
- **Método:** `POST`
- **URL:** `http://localhost:3000/api/users`
- **Body (JSON):**
```json
{
  "username": "jose_ventas",
  "email": "jose@eaglegaming.com",
  "password": "segura123",
  "role": "CASHIER"
}
```

---

## 🔔 5. Notificaciones y Auditoría

### A. Listar alertas pendientes
- **Método:** `GET`
- **URL:** `http://localhost:3000/api/notifications`

### B. Marcar como leída
- **Método:** `PATCH`
- **URL:** `http://localhost:3000/api/notifications/ID/read`

---
> **Tip de Pro:** Si quieres ver cómo cambian los datos en tiempo real mientras pruebas, mantén abierto `npx prisma studio`.
