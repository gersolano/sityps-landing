import { getStore } from '@netlify/blobs';

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }
  const folio = (event.queryStringParameters || {}).folio;
  if (!folio) return json(400, { error: 'Falta folio' });

  try {
    const store = getStore({ name: 'sityps' });
    const ticket = await store.get(`tickets/${folio}.json`, { type: 'json' });
    if (!ticket) return json(404, { error: 'No encontrado' });
    return json(200, { ticket });
  } catch (e) {
    console.error(e);
    return json(500, { error: 'No se pudo obtener' });
  }
}

function json(status, data) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(data) };
}
