const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

function verifyToken(event) {
  const auth = (event.headers['authorization'] || event.headers['Authorization'] || '').replace('Bearer ', '');
  try {
    const [pwd] = Buffer.from(auth, 'base64').toString('utf-8').split(':');
    return pwd === process.env.ADMIN_PASSWORD;
  } catch(e) { return false; }
}

exports.handler = async (event) => {
  if (!verifyToken(event)) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };

  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${process.env.JSONBIN_CONFIG_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': process.env.JSONBIN_API_KEY }
    });
    const data = await res.json();
    const config = data.record || {};

    // Mostra le chiavi del config senza mostrare la private key per intero
    const keys = Object.keys(config);
    const hasSatispayKeyId = !!config.satispayKeyId;
    const hasSatispayPrivateKey = !!config.satispayPrivateKey;

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        configKeys: keys,
        hasSatispayKeyId,
        satispayKeyId: config.satispayKeyId || null,
        hasSatispayPrivateKey,
        privateKeyLength: config.satispayPrivateKey?.length || 0
      })
    };
  } catch(e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
