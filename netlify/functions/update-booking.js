const { getStore } = require('@netlify/blobs');

function verifyToken(event) {
  const auth = event.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '');
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [pwd] = decoded.split(':');
    return pwd === process.env.ADMIN_PASSWORD;
  } catch(e) { return false; }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } };
  }
  if (!verifyToken(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  try {
    const { id, status } = JSON.parse(event.body);
    const store = getStore('pranzo-bookings');
    const raw = await store.get(id);
    if (!raw) return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
    const booking = JSON.parse(raw);
    booking.status = status;
    booking.updatedAt = new Date().toISOString();
    await store.set(id, JSON.stringify(booking));
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true })
    };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
