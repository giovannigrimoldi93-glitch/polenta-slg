const crypto = require('crypto');

const SATISPAY_HOST = 'authservices.satispay.com';
const SATISPAY_BASE = 'https://authservices.satispay.com';

async function getSatispayCredentials() {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${process.env.JSONBIN_SATISPAY_BIN_ID}/latest`, {
    headers: { 'X-Master-Key': process.env.JSONBIN_API_KEY }
  });
  const data = await res.json();
  const record = data.record || {};
  if (!record.satispayKeyId || !record.satispayPrivateKey) {
    throw new Error('Credenziali Satispay non trovate nel database');
  }
  return { keyId: record.satispayKeyId, privateKeyPem: record.satispayPrivateKey };
}

function buildAuthHeader(method, path, body, keyId, privateKeyPem) {
  const date = new Date().toUTCString();
  const bodyStr = body ? JSON.stringify(body) : '';
  const digest = 'SHA-256=' + crypto.createHash('sha256').update(bodyStr).digest('base64');
  const signingString = `(request-target): ${method.toLowerCase()} ${path}\nhost: ${SATISPAY_HOST}\ndate: ${date}\ndigest: ${digest}`;
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
