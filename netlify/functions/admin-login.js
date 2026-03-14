const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...CORS, 'Access-Control-Allow-Headers': 'Content-Type' } };
  }
  try {
    const { password } = JSON.parse(event.body);
    if (password === process.env.ADMIN_PASSWORD) {
      const token = Buffer.from(`${password}:${Date.now()}`).toString('base64');
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ token }) };
    }
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Wrong password' }) };
  } catch(e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
