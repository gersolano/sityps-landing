'use strict';

const { getBlobsStore } = require('./_blobs.cjs');
const { STORE_NAME, TICKETS_PREFIX } = require('./_cfg.cjs');

function ok(body, status = 200) {
  return { statusCode: status, headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) };
}
function fail(e) { return ok({ ok:false, error: String((e && e.message) || e) }, 500); }

async function listKeys(store, prefix, limit = 1000) {
  const out = [];
  const res = await store.list({ prefix, limit });
  const push = (e) => { const k = e?.key || e?.name || e?.path; if (k) out.push(k); };
  if (Array.isArray(res)) res.forEach(push);
  else if (res && Array.isArray(res.items)) res.items.forEach(push);
  return out;
}
async function readJSON(store, key) {
  const raw = await store.get(key, { type: 'text' });
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
async function gatherTicketsFrom(storeName, prefix) {
  const store = await getBlobsStore(storeName);
  const keys = await listKeys(store, prefix, 1000);
  const items = [];
  for (const k of keys) {
    const t = await readJSON(store, k);
    if (!t || !t.folio) continue;
    items.push({
      folio: t.folio,
      fecha: t.createdAt || t.updatedAt || null,
      modulo: t.modulo || '',
      tipo: t.tipo || '',
      nombre: t.nombre || t.solicitante || '',
      solicitante: t.nombre || t.solicitante || '',
      prioridad: t.prioridad || 'Normal',
      estado: t.estado || 'Nuevo',
      ultimoCorreo: t.ultimoCorreo || null,
    });
  }
  items.sort((a,b)=>Date.parse(b.fecha||0)-Date.parse(a.fecha||0));
  return { items, count: items.length };
}

exports.handler = async () => {
  try {
    const r1 = await gatherTicketsFrom(STORE_NAME, TICKETS_PREFIX);
    if (r1.count > 0) return ok({ ok:true, ...r1, store: STORE_NAME, prefix: TICKETS_PREFIX });

    const altStore = STORE_NAME === 'tikects' ? 'tickets' : 'tikects';
    const r2 = await gatherTicketsFrom(altStore, TICKETS_PREFIX);
    if (r2.count > 0) return ok({ ok:true, ...r2, store: altStore, prefix: TICKETS_PREFIX, note: 'fallback-store' });

    const r3 = await gatherTicketsFrom(STORE_NAME, '');
    if (r3.count > 0) return ok({ ok:true, ...r3, store: STORE_NAME, prefix: '', note: 'no-prefix' });

    const r4 = await gatherTicketsFrom(altStore, '');
    if (r4.count > 0) return ok({ ok:true, ...r4, store: altStore, prefix: '', note: 'fallback-no-prefix' });

    return ok({ ok:true, items: [], count: 0, store: STORE_NAME, prefix: TICKETS_PREFIX });
  } catch (e) {
    return fail(e);
  }
};
