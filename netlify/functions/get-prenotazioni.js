// ============================================================
// get-prenotazioni.js
// ============================================================
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
  if (!verifyToken(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  try {
    const store = getStore('pranzo-bookings');
    const keys = await store.list();
    const bookings = [];
    for (const key of (keys.blobs || [])) {
      try {
        const raw = await store.get(key.key);
        bookings.push(JSON.parse(raw));
      } catch(e) {}
    }
    bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(bookings)
    };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
