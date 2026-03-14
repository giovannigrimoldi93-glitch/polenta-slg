const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

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
    return { statusCode: 204, headers: { ...CORS, 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } };
  }
  if (!verifyToken(event)) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  try {
    const apiKey = process.env.JSONBIN_API_KEY;
    const binId = process.env.JSONBIN_BOOKINGS_BIN_ID;

    const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      headers: { 'X-Master-Key': apiKey }
    });
    const data = await res.json();
    const bookings = (data.record?.bookings || [])
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return { statusCode: 200, headers: CORS, body: JSON.stringify(bookings) };
  } catch(e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
