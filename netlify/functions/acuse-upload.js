// netlify/functions/acuse-upload.js
// Sube un archivo (acuse de RH) como Blob.
// Espera body JSON: { fileName, fileB64 }  (fileB64 = base64 del archivo)
import { getStore } from '@netlify/blobs';

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
    const { fileName, fileB64 } = JSON.parse(event.body || '{}');
    if (!fileName || !fileB64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: 'Faltan fileName o fileB64' }),
      };
    }

    const buf = Buffer.from(fileB64, 'base64');
    const safeName = fileName.replace(/[^a-z0-9._-]/gi, '_');
    const key = `adjuntos/acuse_${Date.now()}_${safeName}`;

    const storeName = process.env.BLOBS_STORE_NAME || 'sityps-tickets';
    const opts = { name: storeName };
    if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_API_TOKEN) {
      opts.siteID = process.env.NETLIFY_SITE_ID;
      opts.token = process.env.NETLIFY_API_TOKEN;
    }
    const store = getStore(opts);

    await store.set(key, buf, { contentType: 'application/octet-stream' });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, key }),
    };
  } catch (err) {
    console.error('acuse-upload error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: String(err?.message || err) }),
    };
  }
}
