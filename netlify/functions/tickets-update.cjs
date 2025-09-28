'use strict';

const { getBlobsStore } = require('./_blobs.cjs');
const { getTicket, saveTicket } = require('./_store.cjs');
const { STORE_NAME } = require('./_cfg.cjs');

function j(status, body) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) };
}

async function saveBase64(store, base64, contentType, filename, folio) {
  const raw = base64.replace(/^data:.*;base64,/, '');
  const buf = Buffer.from(raw, 'base64');
  const key = `files/${folio}/${Date.now()}-${(filename||'adjunto.bin').replace(/[^\w.\-]/g,'_')}`;
  await store.set(key, buf, { contentType: contentType || 'application/octet-stream' });
  return { key, filename, contentType: contentType || 'application/octet-stream', size: buf.length };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return j(200, { ok:true });
    if (event.httpMethod !== 'POST')   return j(405, { ok:false, error:'Method Not Allowed' });

    const p = JSON.parse(event.body || '{}');
    const folio = String(p.folio || '').trim();
    if (!folio) return j(400, { ok:false, error:'Falta folio' });

    const t = await getTicket(folio);
    if (!t) return j(404, { ok:false, error:'Ticket no encontrado' });

    const when = new Date().toISOString();
    const cambios = [];
    const push = (campo, antes, despues) => { if (String(antes||'') !== String(despues||'')) cambios.push({ campo, antes: antes||'—', despues: despues||'—' }); };

    push('estado', t.estado, p.estado);
    push('prioridad', t.prioridad, p.prioridad);

    const ticket = {
      ...t,
      estado: p.estado || t.estado,
      prioridad: p.prioridad || t.prioridad,
      updatedAt: when,
    };

    const hist = Array.isArray(t.historial) ? t.historial.slice() : [];
    if (p.nota) cambios.push({ campo:'nota', nota: p.nota });
    if (cambios.length) hist.push({ por: String(p._editor||'backoffice'), fecha: when, cambios });
    ticket.historial = hist;

    if (Array.isArray(p.adjuntos)) {
      const files = await getBlobsStore(STORE_NAME);
      ticket.adjuntos = Array.isArray(ticket.adjuntos) ? ticket.adjuntos.slice() : [];
      for (const a of p.adjuntos) {
        if (!a?.dataBase64) continue;
        const meta = await saveBase64(files, a.dataBase64, a.contentType, a.filename || 'adjunto.bin', folio);
        ticket.adjuntos.push({ ...meta, key: meta.key });
      }
    }

    await saveTicket(ticket);
    return j(200, { ok:true, ticket });
  } catch (e) {
    console.error('tickets-update', e);
    return j(500, { ok:false, error: e.message || 'Error' });
  }
};
