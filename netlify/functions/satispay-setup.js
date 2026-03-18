// satispay-setup.js
// Questa funzione va chiamata UNA SOLA VOLTA per registrare le chiavi RSA
// e ottenere il keyId. Dopo, salva SATISPAY_KEY_ID e SATISPAY_PRIVATE_KEY
// come variabili d'ambiente su Netlify.

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
    // 1. Genera coppia di chiavi RSA 4096
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    // 2. Registra la chiave pubblica con il codice di attivazione
    const res = await fetch('https://authservices.satispay.com/g_business/v1/authentication_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        public_key: publicKey,
        token: activationCode
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Errore Satispay: ' + err }) };
    }

    const data = await res.json();
    const keyId = data.key_id;

    // 3. Restituisce keyId e privateKey da salvare come variabili d'ambiente
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        ok: true,
        keyId,
        privateKey: privateKey.replace(/\n/g, '\\n'),
        instructions: 'Salva questi valori come variabili d\'ambiente su Netlify: SATISPAY_KEY_ID e SATISPAY_PRIVATE_KEY'
      })
    };
  } catch(e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
