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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { ...CORS, 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } };
  
  console.log('diagnostics: auth header presente:', !!(event.headers['authorization'] || event.headers['Authorization']));
  
  if (!verifyToken(event)) {
    console.log('diagnostics: token non valido');
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const config = await jsonbinGet(process.env.JSONBIN_CONFIG_BIN_ID, process.env.JSONBIN_API_KEY);
    const hasKeys = !!(config.satispayKeyId && config.satispayPrivateKey);
    console.log('diagnostics: hasKeys=', hasKeys, 'keyId=', config.satispayKeyId?.substring(0, 20));

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        ok: hasKeys,
        keyId: hasKeys ? config.satispayKeyId : null,
        message: hasKeys ? 'Chiavi presenti' : 'Chiavi non configurate'
      })
    };
  } catch(e) {
    console.error('diagnostics error:', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
