// netlify/functions/acuse-upload.js
const { getTicketStore } = require('./_store.cjs');
const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { name, contentType, base64, key } = JSON.parse(event.body || '{}');
    if (!name || !base64) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Faltan name/base64' }) };
    }
    const buf = Buffer.from(base64, 'base64');
    const store = await getTicketStore();

    const safeName = name.replace(/[^\w.\-]/g, '_');
    const finalKey =
      key ||
      `acuse/${new Date().toISOString().slice(0, 10)}/${Date.now().toString(36)}-${crypto
        .randomBytes(3)
        .toString('hex')}-${safeName}`;

    await store.setBinary(finalKey, buf, contentType || 'application/octet-stream');

    return { statusCode: 200, body: JSON.stringify({ ok: true, key: finalKey }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};
