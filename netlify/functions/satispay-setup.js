// satispay-setup.js
// Genera chiavi RSA, le registra su Satispay e salva keyId + privateKey su JSONBin
// (evita il limite 4KB di AWS Lambda sulle variabili d'ambiente)

const crypto = require('crypto');
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

async function jsonbinPut(binId, apiKey, body) {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Master-Key': apiKey },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('JSONBin PUT failed: ' + await res.text());
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...CORS, 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } };
  }
  if (!verifyToken(event)) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const activationCode = process.env.SATISPAY_ACTIVATION_CODE;
  if (!activationCode) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'SATISPAY_ACTIVATION_CODE non configurato' }) };
  }

  try {
    // 1. Genera coppia di chiavi RSA 2048
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    // 2. Registra la chiave pubblica su Satispay
    const res = await fetch('https://authservices.satispay.com/g_business/v1/authentication_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_key: publicKey, token: activationCode })
    });

    if (!res.ok) {
      const err = await res.text();
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Errore Satispay: ' + err }) };
    }

    const data = await res.json();
    const keyId = data.key_id;

    // 3. Salva keyId e privateKey su JSONBin (nel bin config)
    const apiKey = process.env.JSONBIN_API_KEY;
    const configBinId = process.env.JSONBIN_CONFIG_BIN_ID;
    const config = await jsonbinGet(configBinId, apiKey);
    config.satispayKeyId = keyId;
    config.satispayPrivateKey = privateKey;
    await jsonbinPut(configBinId, apiKey, config);

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        ok: true,
        keyId,
        message: 'Chiavi generate e salvate su JSONBin. Nessuna variabile d\'ambiente aggiuntiva necessaria!'
      })
    };
  } catch(e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
