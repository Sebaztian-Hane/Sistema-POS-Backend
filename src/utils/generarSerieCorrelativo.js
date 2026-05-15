const generarSerieCorrelativo = async ({
  tx,
  tipoComprobante
}) => {

  const serieDoc =
    await tx.documentSeries.findFirst({

      where: {
        tipoComprobante,
        isActive: true
      },

      orderBy: {
        id: 'asc'
      }
    });

  if (!serieDoc) {

    throw new Error(
      `No existe serie activa para ${tipoComprobante}`
    );
  }

  // Incrementar correlativo
  const nuevoCorrelativo =
    serieDoc.correlativoActual + 1;

  // Actualizar DB
  await tx.documentSeries.update({

    where: {
      id: serieDoc.id
    },

    data: {
      correlativoActual: nuevoCorrelativo
    }
  });

  return {

    serie: serieDoc.serie,

    correlativo: nuevoCorrelativo
  };
};

module.exports = {
  generarSerieCorrelativo
};