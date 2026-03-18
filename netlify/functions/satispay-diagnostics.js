const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const { satispayRequest } = require('./satispay-auth-helper');

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
    // Prima verifica che le chiavi esistano nel db
    const apiKey = process.env.JSONBIN_API_KEY;
    const configBinId = process.env.JSONBIN_CONFIG_BIN_ID;
    const config = await jsonbinGet(configBinId, apiKey);

    if (!config.satispayKeyId || !config.satispayPrivateKey) {
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ ok: false, reason: 'no_keys', message: 'Chiavi non ancora configurate' })
      };
    }

    // Verifica che le chiavi funzionino facendo una chiamata semplice
    // Usiamo payments con filtro per verificare la connessione
    try {
      await satispayRequest('GET', '/g_business/v1/payments?limit=1');
    } catch(e) {
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ ok: false, reason: 'invalid_keys', message: 'Chiavi non valide: ' + e.message })
      };
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        ok: true,
        keyId: config.satispayKeyId,
        message: 'Credenziali valide'
      })
    };
  } catch(e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
