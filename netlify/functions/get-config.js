const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

async function jsonbinGet(binId, apiKey) {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
    headers: { 'X-Master-Key': apiKey }
  });
  const data = await res.json();
  return data.record || {};
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...CORS, 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } };
  }
  try {
    const apiKey = process.env.JSONBIN_API_KEY;
    const configBinId = process.env.JSONBIN_CONFIG_BIN_ID;
    const bookingsBinId = process.env.JSONBIN_BOOKINGS_BIN_ID;

    const config = await jsonbinGet(configBinId, apiKey);

    const result = {
      eventDate: config.eventDate || '2026-03-15',
      bookingDeadline: config.bookingDeadline || '2026-03-13',
      maxSeats: config.maxSeats || 320,
      bookingOpen: config.bookingOpen !== false,
      paypalClientId: config.paypalClientId || '',
      satispayEnabled: !!(process.env.SATISPAY_KEY_ID && process.env.SATISPAY_PRIVATE_KEY),
      emailjsServiceId: config.emailjsServiceId || '',
      emailjsTemplateId: config.emailjsTemplateId || '',
      emailjsPublicKey: config.emailjsPublicKey || '',
      adminEmail: config.adminEmail || 'giovanni.grimoldi93@gmail.com',
      closedMessage: config.closedMessage || '',
      menuItems: config.menuItems || [
        { id: 'adulto', name: 'Polenta – Adulto', description: 'Porzione adulto', price: '12.00' },
        { id: 'bambino', name: 'Polenta – Bambino', description: 'Porzione bambino', price: '10.00' },
        { id: 'dolce', name: 'Dolce', description: 'Aggiunta al menù', price: '2.00' },
      ]
    };

    // Count booked seats
    try {
      const bookingsData = await jsonbinGet(bookingsBinId, apiKey);
      const bookings = bookingsData.bookings || [];
      result.bookedSeats = bookings
        .filter(b => b.status !== 'cancelled')
        .reduce((a, b) => a + (b.items || []).reduce((s, i) => s + (i.qty || 1), 0), 0);
    } catch(e) { result.bookedSeats = 0; }

    return { statusCode: 200, headers: CORS, body: JSON.stringify(result) };
  } catch(e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
