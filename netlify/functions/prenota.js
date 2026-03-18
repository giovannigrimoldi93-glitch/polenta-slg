const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const crypto = require('crypto');

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
  if (!res.ok) throw new Error('JSONBin PUT failed: ' + await res.text());
  return res.json();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...CORS, 'Access-Control-Allow-Headers': 'Content-Type' } };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const booking = JSON.parse(event.body);

    if (!booking.nome || !booking.cognome || !booking.email) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ message: 'Dati mancanti' }) };
    }
    if (!booking.items || (!booking.items.length && booking.status !== "waitlist")) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ message: 'Nessuna voce selezionata' }) };
    }

    const apiKey = process.env.JSONBIN_API_KEY;
    const configBinId = process.env.JSONBIN_CONFIG_BIN_ID;
    const bookingsBinId = process.env.JSONBIN_BOOKINGS_BIN_ID;

    // Check availability
    const config = await jsonbinGet(configBinId, apiKey);
    const maxSeats = config.maxSeats || 320;

    const bookingsData = await jsonbinGet(bookingsBinId, apiKey);
    const bookings = bookingsData.bookings || [];
    const booked = bookings
      .filter(b => b.status !== 'cancelled')
      .reduce((a, b) => a + (b.items || []).reduce((s, i) => s + (i.qty || 1), 0), 0);
    const newPax = (booking.items || []).reduce((a, i) => a + (i.qty || 1), 0);

    if (booked + newPax > maxSeats) {
      return { statusCode: 409, headers: CORS, body: JSON.stringify({ message: 'Spiacenti, posti esauriti.' }) };
    }

    // Save booking
    const id = crypto.randomUUID();
    booking.id = id;
    booking.createdAt = new Date().toISOString();
    bookings.push(booking);
    await jsonbinPut(bookingsBinId, apiKey, { bookings });

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ id, ok: true, booking }) };
  } catch(e) {
    console.error(e);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ message: 'Errore server: ' + e.message }) };
  }
};
