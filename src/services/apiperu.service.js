const axios = require('axios');

const API_PERU_URL =
  'https://apiperu.dev/api';

const API_PERU_TOKEN =
  process.env.API_PERU_TOKEN;

const apiPeru = axios.create({

  baseURL: API_PERU_URL,

  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_PERU_TOKEN}`
  },

  timeout: 10000
});

async function consultarDni(dni) {

  try {

    const response = await apiPeru.post(
      '/dni',
      { dni }
    );

    if (!response.data?.success) {

      throw new Error(
        'No se encontró información para el DNI'
      );
    }

    const data = response.data.data;

    return {

      tipoDocumento: 'DNI',

      numeroDocumento: dni,

      nombres: data.nombres,

      apellidoPaterno:
        data.apellido_paterno,

      apellidoMaterno:
        data.apellido_materno,

      nombreCompleto:
        data.nombre_completo
    };

  } catch (error) {

    throw new Error(
      error.response?.data?.message ||
      'Error consultando DNI'
    );
  }
}

async function consultarRuc(ruc) {

  try {

    const response = await apiPeru.post(
      '/ruc',
      { ruc }
    );

    if (!response.data?.success) {

      throw new Error(
        'No se encontró información para el RUC'
      );
    }

    const data = response.data.data;

    return {

      tipoDocumento: 'RUC',

      numeroDocumento: data.ruc,

      razonSocial:
        data.nombre_o_razon_social,

      direccion:
        data.direccion,

      direccionCompleta:
        data.direccion_completa,

      estado:
        data.estado,

      condicion:
        data.condicion,

      departamento:
        data.departamento,

      provincia:
        data.provincia,

      distrito:
        data.distrito
    };

  } catch (error) {

    throw new Error(
      error.response?.data?.message ||
      'Error consultando RUC'
    );
  }
}

module.exports = {
  consultarDni,
  consultarRuc
};