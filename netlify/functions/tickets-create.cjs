'use strict';

const { getBlobsStore } = require('./_blobs.cjs');
const { saveTicket } = require('./_store.cjs');
const { STORE_NAME } = require('./_cfg.cjs');

function j(status, body) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) };
}

function uid() { return Math.random().toString(36).slice(2,8).toUpperCase(); }
function newFolio() { return `T-${uid()}${uid()}-${uid()}`; }

async function saveBase64(store, base64, contentType, filename, folio) {
  const raw = base64.replace(/^data:.*;base64,/, '');
  const buf = Buffer.from(raw, 'base64');
  const key = `files/${folio}/${Date.now()}-${(filename||'archivo.bin').replace(/[^\w.\-]/g,'_')}`;
  await store.set(key, buf, { contentType: contentType || 'application/octet-stream' });
  return { key, filename, contentType: contentType || 'application/octet-stream', size: buf.length };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return j(200, { ok:true });
    if (event.httpMethod !== 'POST')   return j(405, { ok:false, error:'Method Not Allowed' });

    const p = JSON.parse(event.body || '{}');
    const folio = p.folio || newFolio();
    const when = new Date().toISOString();

    const ticket = {
      folio,
      createdAt: when,
      updatedAt: when,
      modulo: p.modulo || 'Soporte Técnico',
      tipo: p.tipo || 'General',
      estado: p.estado || 'Nuevo',
      prioridad: p.prioridad || 'Normal',
      nombre: p.nombre || '',
      correo: p.correo || '',
      telefono: p.telefono || '',
      facilidades: undefined,
      adjuntos: [],
      historial: [],
    };

    const files = await getBlobsStore(STORE_NAME);

    if (p.facilidades?.dataBase64) {
      const meta = await saveBase64(files, p.facilidades.dataBase64, p.facilidades.contentType, p.facilidades.filename || 'acuse.pdf', folio);
      ticket.facilidades = { ...meta, acuseKey: meta.key };
    }

    if (Array.isArray(p.adjuntos)) {
      for (const a of p.adjuntos) {
        if (!a?.dataBase64) continue;
        const meta = await saveBase64(files, a.dataBase64, a.contentType, a.filename || 'adjunto.bin', folio);
        ticket.adjuntos.push({ ...meta, key: meta.key });
      }
    }

    await saveTicket(ticket);
    return j(200, { ok:true, ticket });
  } catch (e) {
    console.error('tickets-create', e);
    return j(500, { ok:false, error: e.message || 'Error' });
  }
};
