export const enviarComprobanteApisunat = async (payload) => {
  const response = await fetch(
    'https://back.apisunat.com/personas/v1/sendBill',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  let data = null;

  try {
    data = await response.json();
  } catch (e) {
    // por si la respuesta no es JSON
    throw new Error('APISUNAT respondió algo no válido');
  }

  if (!response.ok) {
    console.error('ERROR APISUNAT FULL:', data);

    throw new Error(
      data?.message ||
      data?.error ||
      JSON.stringify(data, null, 2)
    );
  }

  return data;
};