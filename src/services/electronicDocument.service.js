const prisma =
  require('../libs/prisma');

async function crearDocumentoElectronico({

  saleId,
  tipoComprobante,
  serie,
  correlativo,
  payloadJson

}) {

  return prisma.electronicDocument.create({

    data: {

      saleId,

      tipoComprobante,

      serie,

      correlativo,

      payloadJson,

      sunatStatus: 'PENDIENTE'
    }
  });
}

async function actualizarEstadoDocumento({

  saleId,
  estado,
  respuestaSunat,
  observaciones,
  codigoHash,
  codigoCdr

}) {

  return prisma.electronicDocument.update({

    where: {
      saleId
    },

    data: {

      sunatStatus: estado,

      respuestaSunat,

      observaciones,

      codigoHash,

      codigoCdr,

      enviadoEn: new Date()
    }
  });
}

module.exports = {

  crearDocumentoElectronico,

  actualizarEstadoDocumento
};