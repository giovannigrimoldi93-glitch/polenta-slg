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

async function jsonbinGet(binId, apiKey) {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
    headers: { 'X-Master-Key': apiKey }
  });
  const data = await res.json();
  return data.record || {};
}

exports.handler = async (event) => {
  if (!verifyToken(event)) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  try {
    const config = await jsonbinGet(
      process.env.JSONBIN_CONFIG_BIN_ID,
      process.env.JSONBIN_API_KEY
    );

    if (!config.satispayKeyId || !config.satispayPrivateKey) {
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ ok: false, reason: 'no_keys', message: 'Chiavi non configurate' })
      };
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        ok: true,
        keyId: config.satispayKeyId,
        message: 'Chiavi presenti nel database'
      })
    };
  } catch(e) {
    console.error('Diagnostics error:', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
