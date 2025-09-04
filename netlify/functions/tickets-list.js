import { getStore } from '@netlify/blobs';

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  const { search = '', modulo = '', tipo = '', estado = '' } =
    event.queryStringParameters || {};

  try {
    const store = getStore({ name: 'sityps' });
    const list = await store.list({ prefix: 'tickets/' });

    const tickets = [];
    await Promise.all(
      list.blobs.map(async (b) => {
        const raw = await store.get(b.key, { type: 'json' });
        if (raw) tickets.push(raw);
      })
    );

    const q = norm(search);
    const out = tickets
      .filter((t) => (modulo ? String(t.moduloDestino).toLowerCase() === String(modulo).toLowerCase() : true))
      .filter((t) => (tipo ? String(t.tipo).toLowerCase() === String(tipo).toLowerCase() : true))
      .filter((t) => (estado ? String(t.estado).toLowerCase() === String(estado).toLowerCase() : true))
      .filter((t) => {
        if (!q) return true;
        const hay = [t.folio, t.nombre, t.correo, t.telefono, t.descripcion, t.unidadAdscripcion].join(' ').toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));

    return json(200, { tickets: out });
  } catch (e) {
    console.error(e);
    return json(500, { error: 'No se pudo listar' });
  }
}

function norm(s) { return String(s || '').trim().toLowerCase(); }
function json(status, data) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(data) };
}
