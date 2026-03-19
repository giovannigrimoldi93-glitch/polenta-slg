const crypto = require('crypto');
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

function verifyToken(event) {
  const auth = (event.headers['authorization'] || event.headers['Authorization'] || '').replace('Bearer ', '');
  try {
    const [pwd] = Buffer.from(auth, 'base64').toString('utf-8').split(':');
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
  await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Master-Key': apiKey },
    body: JSON.stringify(body)
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { ...CORS, 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } };
  if (!verifyToken(event)) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };

  const activationCode = process.env.SATISPAY_ACTIVATION_CODE;
  if (!activationCode) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'SATISPAY_ACTIVATION_CODE mancante' }) };

  try {
    // Genera chiavi RSA 2048
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    // Registra su Satispay
    const res = await fetch('https://authservices.satispay.com/g_business/v1/authentication_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_key: publicKey, token: activationCode })
    });

    const satispayData = await res.json();
    if (!res.ok) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Satispay: ' + JSON.stringify(satispayData) }) };

    const keyId = satispayData.key_id;
    console.log('Satispay keyId ottenuto:', keyId);

    // Salva su JSONBin — MERGE con config esistente, non sovrascrivere
    const apiKey = process.env.JSONBIN_API_KEY;
    const configBinId = process.env.JSONBIN_CONFIG_BIN_ID;
    const existingConfig = await jsonbinGet(configBinId, apiKey);
    const newConfig = { ...existingConfig, satispayKeyId: keyId, satispayPrivateKey: privateKey };
    await jsonbinPut(configBinId, apiKey, newConfig);
    console.log('Chiavi salvate su JSONBin');

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, keyId, message: 'Chiavi generate e salvate!' }) };
  } catch(e) {
    console.error('Setup error:', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
