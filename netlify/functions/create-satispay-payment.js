// create-satispay-payment.js
// Crea una transazione Satispay e restituisce il link di redirect

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const { satispayRequest } = require('./satispay-auth-helper');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...CORS, 'Access-Control-Allow-Headers': 'Content-Type' } };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { bookingId, amount, nome } = JSON.parse(event.body);

    if (!bookingId || !amount) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'bookingId e amount sono obbligatori' }) };
    }

    const baseUrl = process.env.SITE_URL || 'https://polentata-slg.netlify.app';
    const redirectUrl = `${baseUrl}/grazie.html?id=${bookingId}&nome=${encodeURIComponent(nome || '')}&metodo=satispay`;
    const callbackUrl = `${baseUrl}/api/satispay-callback?booking_id=${bookingId}`;

    const payment = await satispayRequest('POST', '/g_business/v1/payments', {
      flow: 'MATCH_CODE',
      amount_unit: Math.round(amount * 100), // in centesimi
      currency: 'EUR',
      callback_url: callbackUrl,
      redirect_url: redirectUrl,
      metadata: {
        booking_id: bookingId
      }
    });

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        ok: true,
        paymentId: payment.id,
        redirectUrl: payment.redirect_url
      })
    };
  } catch(e) {
    console.error('Satispay error:', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
