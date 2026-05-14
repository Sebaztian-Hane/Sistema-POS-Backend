const axios = require('axios');

const prisma = require('../config/prisma');

const enviarComprobante = async ({
  saleId,
  payload
}) => {

  try {

    // Crear registro inicial
    const documento =
      await prisma.electronicDocument.create({

        data: {

          saleId,

          fileName: payload.fileName,

          payloadJson: payload,

          sunatStatus: 'PENDIENTE'
        }
      });

    // Enviar a APISUNAT
    const response = await axios.post(

      'https://back.apisunat.com/personas/v1/sendBill',

      payload,

      {
        headers: {
          'Content-Type': 'application/json'
        },

        timeout: 30000
      }
    );

    const data = response.data;

    // Determinar estado
    let estado = 'ENVIADO';

    if (
      data.success === true ||
      data.sunatResponse?.success === true
    ) {

      estado = 'ACEPTADO';
    }

    // Actualizar documento
    const documentoActualizado =
      await prisma.electronicDocument.update({

        where: {
          id: documento.id
        },

        data: {

          apiResponse: data,

          hash:
            data.hash ||
            data.sunatResponse?.hash ||

            null,

          qrData:
            data.qr ||

            null,

          ticket:
            data.ticket ||

            null,

          cdrCode:
            data.sunatResponse?.cdrCode ||

            null,

          cdrDescription:
            data.sunatResponse?.cdrDescription ||

            null,

          sunatStatus: estado,

          sentAt: new Date()
        }
      });

    return {

      ok: true,

      documento: documentoActualizado,

      response: data
    };

  } catch (error) {

    console.error(
      'ERROR ENVIANDO COMPROBANTE:',
      error.response?.data || error.message
    );

    // Intentar guardar error
    try {

      await prisma.electronicDocument.update({

        where: {
          saleId
        },

        data: {

          sunatStatus: 'ERROR',

          apiResponse:
            error.response?.data ||

            {
              message: error.message
            }
        }
      });

    } catch (dbError) {

      console.error(
        'ERROR ACTUALIZANDO DOCUMENTO:',
        dbError.message
      );
    }

    return {

      ok: false,

      error:
        error.response?.data ||

        {
          message: error.message
        }
    };
  }
};

module.exports = {
  enviarComprobante
};