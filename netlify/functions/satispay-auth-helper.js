// satispay-auth-helper.js
// Legge keyId e privateKey da JSONBin e firma le richieste Satispay

const crypto = require('crypto');

const SATISPAY_HOST = 'authservices.satispay.com';
const SATISPAY_BASE = 'https://authservices.satispay.com';

async function getSatispayCredentials() {
  const apiKey = process.env.JSONBIN_API_KEY;
  const configBinId = process.env.JSONBIN_CONFIG_BIN_ID;
  const res = await fetch(`https://api.jsonbin.io/v3/b/${configBinId}/latest`, {
    headers: { 'X-Master-Key': apiKey }
  });
  const data = await res.json();
  const config = data.record || {};
  if (!config.satispayKeyId || !config.satispayPrivateKey) {
    throw new Error('Credenziali Satispay non trovate. Esegui prima il setup da /admin/satispay-setup.html');
  }
  return { keyId: config.satispayKeyId, privateKeyPem: config.satispayPrivateKey };
}

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
  const { keyId, privateKeyPem } = await getSatispayCredentials();
  const { authorization, date, digest } = buildAuthHeader(method, path, body, keyId, privateKeyPem);

  const res = await fetch(`${SATISPAY_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Host': SATISPAY_HOST,
      'Date': date,
      'Digest': digest,
      'Authorization': authorization
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

module.exports = { satispayRequest };
