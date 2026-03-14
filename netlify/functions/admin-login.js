exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' } };
  }
  try {
    const { password } = JSON.parse(event.body);
    if (password === process.env.ADMIN_PASSWORD) {
      // Simple token: base64(password:timestamp)
      const token = Buffer.from(`${password}:${Date.now()}`).toString('base64');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ token })
      };
    }
    return { statusCode: 401, body: JSON.stringify({ error: 'Wrong password' }) };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
