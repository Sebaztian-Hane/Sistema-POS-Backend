const prisma = require("../libs/prisma");
const { consultarDni, consultarRuc } = require('./apiperu.service');

async function buscarOcrearCliente(documento) {
  try {
    if (!documento) {
      return null;
    }

    const documentoLimpio = String(documento).trim();
    console.log(`Buscando/creando cliente para documento: ${documentoLimpio}`);

    // Detectar tipo documento
    let tipoDocumento;
    // ✅ BIEN - Primero validar que sean solo números
    if (!/^\d+$/.test(documentoLimpio)) {
    throw new Error(`Documento inválido: debe contener solo números. Recibido: ${documentoLimpio}`);
    }

    // Luego validar longitud
    if (documentoLimpio.length === 8) {
    tipoDocumento = 'DNI';
    } else if (documentoLimpio.length === 11) {
    tipoDocumento = 'RUC';
    } else {
    throw new Error(`Documento inválido: debe tener 8 (DNI) o 11 (RUC) dígitos. Recibido: ${documentoLimpio.length}`);
    }

    // Buscar cliente local
    const clienteExistente = await prisma.customer.findUnique({
      where: {
        nroDocumento: documentoLimpio,
        isActive: true  // Solo clientes activos
      }
    });

    if (clienteExistente) {
      console.log(`Cliente encontrado: ${clienteExistente.nombre} (${clienteExistente.nroDocumento})`);
      return clienteExistente;
    }

    console.log(`Cliente no encontrado, consultando API Perú para ${tipoDocumento}: ${documentoLimpio}`);

    // Consultar API Perú
    let datosCliente;
    if (tipoDocumento === 'DNI') {
      datosCliente = await consultarDni(documentoLimpio);
      if (!datosCliente || !datosCliente.nombres) {
        throw new Error(`DNI ${documentoLimpio} no encontrado en SUNAT`);
      }
    } else {
      datosCliente = await consultarRuc(documentoLimpio);
      if (!datosCliente || !datosCliente.razonSocial) {
        throw new Error(`RUC ${documentoLimpio} no encontrado en SUNAT`);
      }
    }

    // Crear cliente según tipo
    let nuevoCliente;
    
    if (tipoDocumento === 'DNI') {
      // Construir nombre completo
      const partes = [
        datosCliente.nombres,
        datosCliente.apellidoPaterno,
        datosCliente.apellidoMaterno
      ].filter(Boolean);
      
      const nombreCompleto = partes.join(' ').trim().replace(/\s+/g, ' ');

      nuevoCliente = await prisma.customer.create({
        data: {
          nombre: nombreCompleto,
          tipoDocumento: 'DNI',
          nroDocumento: documentoLimpio,
          isActive: true,
          // Campos adicionales si existen en tu modelo
          // email: datosCliente.email || null,
          // telefono: datosCliente.telefono || null,
        }
      });
      
      console.log(`Cliente DNI creado: ${nombreCompleto} (${documentoLimpio})`);
      
    } else {
      // RUC
      nuevoCliente = await prisma.customer.create({
        data: {
          nombre: datosCliente.razonSocial,
          razonSocial: datosCliente.razonSocial,
          tipoDocumento: 'RUC',
          nroDocumento: documentoLimpio,
          direccion: datosCliente.direccion || null,
          isActive: true,
          // Campos adicionales
          // email: datosCliente.email || null,
          // telefono: datosCliente.telefono || null,
        }
      });
      
      console.log(`Cliente RUC creado: ${datosCliente.razonSocial} (${documentoLimpio})`);
    }

    return nuevoCliente;
    
  } catch (error) {
    console.error('Error en buscarOcrearCliente:', error);
    throw error;
  }
}

module.exports = {
  buscarOcrearCliente
};