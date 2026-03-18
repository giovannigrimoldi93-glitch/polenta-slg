// satispay-auth-helper.js
// Modulo condiviso per firmare le richieste Satispay con RSA-SHA256

const crypto = require('crypto');

const SATISPAY_HOST = 'authservices.satispay.com';
const SATISPAY_BASE = 'https://authservices.satispay.com';

function buildAuthHeader(method, path, body, keyId, privateKeyPem) {
  const date = new Date().toUTCString();
  const bodyStr = body ? JSON.stringify(body) : '';
  const digest = 'SHA-256=' + crypto.createHash('sha256').update(bodyStr).digest('base64');

  const signingString =
    `(request-target): ${method.toLowerCase()} ${path}\n` +
    `host: ${SATISPAY_HOST}\n` +
    `date: ${date}\n` +
    `digest: ${digest}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingString);
  const signature = sign.sign(privateKeyPem, 'base64');

  const authorization = `Signature keyId="${keyId}", algorithm="rsa-sha256", headers="(request-target) host date digest", signature="${signature}"`;

  return { authorization, date, digest };
}

async function satispayRequest(method, path, body) {
  const keyId = process.env.SATISPAY_KEY_ID;
  const privateKeyRaw = process.env.SATISPAY_PRIVATE_KEY;

  if (!keyId || !privateKeyRaw) {
    throw new Error('SATISPAY_KEY_ID o SATISPAY_PRIVATE_KEY non configurati. Esegui prima satispay-setup.');
  }

  // Ripristina i newline nella chiave privata
  const privateKeyPem = privateKeyRaw.replace(/\\n/g, '\n');

  const { authorization, date, digest } = buildAuthHeader(method, path, body, keyId, privateKeyPem);

  const headers = {
    'Content-Type': 'application/json',
    'Host': SATISPAY_HOST,
    'Date': date,
    'Digest': digest,
    'Authorization': authorization
  };

  const res = await fetch(`${SATISPAY_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

module.exports = { satispayRequest };
