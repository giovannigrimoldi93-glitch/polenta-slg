// satispay-callback.js
// Webhook chiamato da Satispay dopo il pagamento
// Aggiorna automaticamente la prenotazione a "paid"

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
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...CORS, 'Access-Control-Allow-Headers': 'Content-Type' } };
  }

  try {
    // Satispay invia il payment_id come query param o nel body
    const params = new URLSearchParams(event.rawQuery || '');
    const paymentId = params.get('payment_id') || JSON.parse(event.body || '{}').payment_id;

    if (!paymentId) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'payment_id mancante' }) };
    }

    // Verifica lo stato del pagamento direttamente con Satispay
    const payment = await satispayRequest('GET', `/g_business/v1/payments/${paymentId}`);

    if (payment.status !== 'ACCEPTED') {
      // Pagamento non completato, non facciamo nulla
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, status: payment.status }) };
    }

    // Recupera il booking_id dai metadata
    const bookingId = payment.metadata?.booking_id;
    if (!bookingId) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'booking_id non trovato nei metadata' }) };
    }

    // Aggiorna la prenotazione su JSONBin
    const apiKey = process.env.JSONBIN_API_KEY;
    const binId = process.env.JSONBIN_BOOKINGS_BIN_ID;

    const bookingsData = await jsonbinGet(binId, apiKey);
    const bookings = bookingsData.bookings || [];

    const idx = bookings.findIndex(b => b.id === bookingId);
    if (idx === -1) {
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Prenotazione non trovata' }) };
    }

    bookings[idx].status = 'paid';
    bookings[idx].satispayPaymentId = paymentId;
    bookings[idx].paidAt = new Date().toISOString();
    bookings[idx].updatedAt = new Date().toISOString();

    await jsonbinPut(binId, apiKey, { bookings });

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
  } catch(e) {
    console.error('Satispay callback error:', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
