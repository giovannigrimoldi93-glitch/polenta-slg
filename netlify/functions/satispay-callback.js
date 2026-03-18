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
  // Log tutto per debug
  console.log('Satispay callback received:', {
    method: event.httpMethod,
    query: event.rawQuery,
    headers: event.headers,
    body: event.body
  });

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...CORS, 'Access-Control-Allow-Headers': 'Content-Type' } };
  }

  try {
    // Satispay può inviare il payment_id in vari modi
    let paymentId = null;

    // 1. Come query param ?payment_id=xxx
    if (event.rawQuery) {
      const params = new URLSearchParams(event.rawQuery);
      paymentId = params.get('payment_id');
    }

    // 2. Nel body JSON
    if (!paymentId && event.body) {
      try {
        const body = JSON.parse(event.body);
        paymentId = body.payment_id || body.id;
      } catch(e) {}
    }

    // 3. Nel body come form-encoded
    if (!paymentId && event.body) {
      try {
        const params = new URLSearchParams(event.body);
        paymentId = params.get('payment_id');
      } catch(e) {}
    }

    console.log('Extracted paymentId:', paymentId);

    if (!paymentId) {
      console.error('payment_id mancante. Body:', event.body, 'Query:', event.rawQuery);
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'payment_id mancante' }) };
    }

    // Verifica lo stato con Satispay
    const payment = await satispayRequest('GET', `/g_business/v1/payments/${paymentId}`);
    console.log('Payment status from Satispay:', payment.status, 'metadata:', payment.metadata);

    if (payment.status !== 'ACCEPTED') {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, status: payment.status }) };
    }

    // Recupera booking_id dai metadata
    const bookingId = payment.metadata?.booking_id;
    if (!bookingId) {
      console.error('booking_id non trovato nei metadata:', payment.metadata);
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'booking_id non trovato nei metadata' }) };
    }

    // Aggiorna prenotazione
    const apiKey = process.env.JSONBIN_API_KEY;
    const binId = process.env.JSONBIN_BOOKINGS_BIN_ID;
    const bookingsData = await jsonbinGet(binId, apiKey);
    const bookings = bookingsData.bookings || [];
    const idx = bookings.findIndex(b => b.id === bookingId);

    if (idx === -1) {
      console.error('Prenotazione non trovata:', bookingId);
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Prenotazione non trovata' }) };
    }

    bookings[idx].status = 'paid';
    bookings[idx].satispayPaymentId = paymentId;
    bookings[idx].paidAt = new Date().toISOString();
    bookings[idx].updatedAt = new Date().toISOString();
    await jsonbinPut(binId, apiKey, { bookings });

    console.log('Prenotazione flaggata come pagata:', bookingId);
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };

  } catch(e) {
    console.error('Satispay callback error:', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
