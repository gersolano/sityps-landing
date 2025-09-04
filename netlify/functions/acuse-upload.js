import { getStore } from '@netlify/blobs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }
  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'JSON inválido' });
  }

  const { filename, mime, base64 } = body;
  if (!filename || !mime || !base64) {
    return json(400, { error: 'Faltan datos del archivo' });
  }

  try {
    // base64 puede venir como "data:<mime>;base64,XXXXX"
    const b64 = String(base64);
    const comma = b64.indexOf(',');
    const raw = comma >= 0 ? b64.slice(comma + 1) : b64;
    const buf = Buffer.from(raw, 'base64');

    if (buf.length > 4 * 1024 * 1024) {
      return json(413, { error: 'Archivo mayor a 4MB' });
    }

    const key = `acuse/${Date.now()}-${slug(filename)}`;
    const store = getStore({ name: 'sityps' });

    await store.set(key, buf, { contentType: mime });

    return json(200, { ok: true, key });
  } catch (e) {
    console.error(e);
    return json(500, { error: 'No se pudo subir el archivo' });
  }
}

function slug(name) {
  return String(name)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]+/g, '-')
    .slice(0, 80);
}
function json(status, data) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(data) };
}
