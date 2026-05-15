const syncPendientes = async () => {

  const pendientes =
    await prisma.electronicDocument.findMany({

      where: {
        sunatStatus: 'PENDIENTE',
        documentId: {
          not: null
        }
      }
    });

  for (const doc of pendientes) {

    try {

      const response =
        await getDocumentById(
          doc.documentId
        );

      await prisma.electronicDocument.update({

        where: {
          id: doc.id
        },

        data: {

          sunatStatus:
            response.status,

          respuestaSunat:
            response,

          xmlUrl:
            response.xml || null,

          cdrUrl:
            response.cdr || null,

          respondedEn:
            response.responseTime
              ? new Date(
                  response.responseTime * 1000
                )
              : null,

          observaciones:
            JSON.stringify({
              faults:
                response.faults || [],

              notes:
                response.notes || []
            })
        }
      });

    } catch (error) {

      console.error(
        'Error sincronizando documento:',
        doc.id,
        error.message
      );
    }
  }
};