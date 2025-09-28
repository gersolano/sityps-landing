// netlify/functions/attachments-download.cjs
'use strict';

const { getBlobsStore } = require('./_blobs.cjs');
const { STORE_NAME } = require('./_cfg.cjs'); //

function bad(code, msg) {
  return {
    statusCode: code,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ ok: false, error: msg }),
  };
}

exports.handler = async (event) => {
  try {
    const url = new URL(event.rawUrl || event.url || `http://localhost${event.path}?${event.queryStringParameters||''}`);
    const key  = url.searchParams.get('key');
    const name = url.searchParams.get('name') || 'archivo.bin';
    if (!key) return bad(400, 'Falta key');

    const store = await getBlobsStore('tickets');
    const blob  = await store.get(key);
    if (!blob?.body) return bad(404, 'Archivo no encontrado');

    let buf;
    if (Buffer.isBuffer(blob.body)) {
      buf = blob.body;
    } else if (typeof blob.body.arrayBuffer === 'function') {
      buf = Buffer.from(await blob.body.arrayBuffer());
    } else if (typeof blob.body.getReader === 'function') {
      const r = blob.body.getReader(); const chunks = [];
      while (true) { const { done, value } = await r.read(); if (done) break; chunks.push(Buffer.from(value)); }
      buf = Buffer.concat(chunks);
    } else {
      const text = await store.get(key, { type: 'text' });
      buf = Buffer.from(text || '', 'utf8');
    }

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Content-Type': blob.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${name}"`,
      },
      body: buf.toString('base64'),
    };
  } catch (err) {
    console.error('attachments-download error:', err);
    return bad(500, String(err?.message || err));
  }
};
