// services/apisunat.service.js
const APISUNAT_BASE_URL = 'https://back.apisunat.com';

/**
 * Envío de documentos a SUNAT
 * POST /personas/v1/sendBill
 */
const sendBill = async (payload) => {
  const url = `${APISUNAT_BASE_URL}/personas/v1/sendBill`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error('APISUNAT respondió algo no válido');
  }

  if (data.status !== 'PENDIENTE') {

  console.error(
    'APISUNAT STATUS ERROR:',
    data
  );

  throw new Error(
    JSON.stringify(
      data.error || data,
      null,
      2
    )
  );
}
  // Respuesta esperada: { "status": "PENDIENTE", "documentId": "xxxxx" }
  return data;
};

/**
 * Consulta de estado de un documento
 * GET /documents/:documentId/getById
 */
const getDocumentById = async (documentId) => {
  const url = `${APISUNAT_BASE_URL}/documents/${documentId}/getById`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error('APISUNAT respondió algo no válido al consultar documento');
  }

  if (!response.ok) {
    console.error('ERROR APISUNAT getDocumentById:', data);
    throw new Error(
      data?.message ||
      data?.error ||
      JSON.stringify(data, null, 2)
    );
  }

  // Respuesta esperada: 
  // {
  //   "production": true,
  //   "status": "ACEPTADO", // o "RECHAZADO", "EXCEPCION"
  //   "type": "01",
  //   "issueTime": 1604698592,
  //   "responseTime": 1604698788,
  //   "fileName": "20123456789-01-F001-00000001",
  //   "xml": "https://...",
  //   "cdr": "https://...",
  //   "faults": [],
  //   "notes": [],
  //   "personaId": "5f6cd73425f5c52d375dd55c",
  //   "reference": "..."
  // }
  return data;
};

/**
 * Anulación de documentos
 * POST /personas/v1/voidBill
 */
const voidBill = async (payload) => {
  const url = `${APISUNAT_BASE_URL}/personas/v1/voidBill`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error('APISUNAT respondió algo no válido al anular');
  }

    if (data.status !== 'PENDIENTE') {

    console.error(
        'APISUNAT VOID STATUS ERROR:',
        data
    );

    throw new Error(
        JSON.stringify(
        data.error || data,
        null,
        2
        )
    );
    }

  // Respuesta esperada: { "status": "PENDIENTE", "documentId": "xxxxx" }
  return data;
};

/**
 * Generar URL para descargar PDF desde APISUNAT
 * GET /documents/:documentId/getPDF/:format/:fileName.pdf
 * 
 * @param {string} documentId - ID del documento en APISUNAT
 * @param {string} format - Formato: 'A4', 'A5', 'ticket58mm', 'ticket80mm'
 * @param {string} fileName - Nombre del archivo (ej: 20123456789-01-F001-00000001.pdf)
 * @returns {string} URL completa para descargar el PDF
 */
const getPdfUrl = (documentId, format, fileName) => {
  const formatMap = {
    'A4': 'A4',
    'A5': 'A5',
    'ticket58mm': 'ticket58mm',
    'ticket80mm': 'ticket80mm'
  };
  
  const formatoValido = formatMap[format] || 'ticket80mm';
  const nombreArchivo = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  
  return `${APISUNAT_BASE_URL}/documents/${documentId}/getPDF/${formatoValido}/${nombreArchivo}`;
};

/**
 * Obtener último correlativo desde APISUNAT
 * POST /personas/lastDocument
 * 
 * NOTA: Este endpoint es opcional. Se recomienda NO depender de él
 * y mantener el control local con DocumentSeries.
 */
const getLastDocument = async (payload) => {
  const url = `${APISUNAT_BASE_URL}/personas/lastDocument`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error('APISUNAT respondió algo no válido al consultar último documento');
  }

  if (!response.ok) {
    console.error('ERROR APISUNAT lastDocument:', data);
    throw new Error(
      data?.message ||
      data?.error ||
      JSON.stringify(data, null, 2)
    );
  }

  // Respuesta esperada:
  // {
  //   "personaId": "5f6cd73425f5c52d375dd55c",
  //   "production": true,
  //   "type": "01",
  //   "serie": "F001",
  //   "lastNumber": "00000001",
  //   "suggestedNumber": "00000002"
  // }
  return data;
};

module.exports = {
  sendBill,
  getDocumentById,
  voidBill,
  getPdfUrl,
  getLastDocument
};