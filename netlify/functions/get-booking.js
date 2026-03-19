const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { ...CORS, 'Access-Control-Allow-Headers': 'Content-Type' } };

  const bookingId = event.queryStringParameters?.id;
  if (!bookingId) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'id mancante' }) };

  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BOOKINGS_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': process.env.JSONBIN_API_KEY }
    });
    const data = await res.json();
    const bookings = data.record?.bookings || [];
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Non trovata' }) };

    // Restituisce solo i dati pubblici necessari
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ status: booking.status, paymentMethod: booking.paymentMethod })
    };
  } catch(e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
