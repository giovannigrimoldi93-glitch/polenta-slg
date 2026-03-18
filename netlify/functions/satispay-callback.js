const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const { satispayRequest } = require('./satispay-auth-helper');

async function jsonbinGet(binId, apiKey) {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
    headers: { 'X-Master-Key': apiKey }
  });
  const data = await res.json();
  return data.record || {};
}

async function jsonbinPut(binId, apiKey, body) {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Master-Key': apiKey },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('JSONBin PUT failed');
}

exports.handler = async (event) => {
  console.log('Satispay callback:', {
    method: event.httpMethod,
    query: event.queryStringParameters,
    rawQuery: event.rawQuery
  });

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...CORS, 'Access-Control-Allow-Headers': 'Content-Type' } };
  }

  try {
    const apiKey = process.env.JSONBIN_API_KEY;
    const binId = process.env.JSONBIN_BOOKINGS_BIN_ID;

    // Legge booking_id dall'URL del callback
    const bookingId = event.queryStringParameters?.booking_id;

    if (!bookingId) {
      console.error('booking_id mancante nei query params:', event.queryStringParameters);
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'booking_id mancante' }) };
    }

    console.log('Processing booking:', bookingId);

    // Cerca la prenotazione nel db
    const bookingsData = await jsonbinGet(binId, apiKey);
    const bookings = bookingsData.bookings || [];
    const idx = bookings.findIndex(b => b.id === bookingId);

    if (idx === -1) {
      console.error('Prenotazione non trovata:', bookingId);
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Prenotazione non trovata' }) };
    }

    // Cerca il pagamento Satispay corrispondente tra i pagamenti recenti
    // filtriamo per metadata.booking_id
    let paymentId = null;
    try {
      const payments = await satispayRequest('GET', '/g_business/v1/payments?limit=10&status=ACCEPTED');
      const match = (payments.data || payments.payment_list || [])
        .find(p => p.metadata?.booking_id === bookingId);
      if (match) paymentId = match.id;
    } catch(e) {
      console.log('Non riesco a cercare i pagamenti, procedo comunque:', e.message);
    }

    // Aggiorna la prenotazione a pagato
    bookings[idx].status = 'paid';
    if (paymentId) bookings[idx].satispayPaymentId = paymentId;
    bookings[idx].paidAt = new Date().toISOString();
    bookings[idx].updatedAt = new Date().toISOString();
    await jsonbinPut(binId, apiKey, { bookings });

    console.log('Prenotazione flaggata pagata:', bookingId);
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };

  } catch(e) {
    console.error('Satispay callback error:', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
