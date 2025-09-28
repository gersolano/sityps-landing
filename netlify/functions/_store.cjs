'use strict';

const { getBlobsStore } = require('./_blobs.cjs');
const { STORE_NAME, TICKETS_PREFIX } = require('./_cfg.cjs');

function keyForTicket(folio) {
  return `${TICKETS_PREFIX}${folio}.json`;
}
async function _store() { return await getBlobsStore(STORE_NAME); }

async function getTicket(folio) {
  const s = await _store();
  const raw = await s.get(keyForTicket(folio), { type: 'text' });
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function saveTicket(ticket) {
  if (!ticket?.folio) throw new Error('Ticket sin folio');
  const s = await _store();
  const key = keyForTicket(ticket.folio);
  await s.set(key, JSON.stringify(ticket), { contentType: 'application/json; charset=utf-8' });
  return ticket;
}

// Listado robusto (por si el runtime no expone async-iterable)
async function listTicketKeys(limit = 1000) {
  const s = await _store();
  const out = [];
  if (typeof s.list === 'function') {
    const it = s.list({ prefix: TICKETS_PREFIX });
    if (it && typeof it[Symbol.asyncIterator] === 'function') {        // A) async-iterable
      for await (const e of it) { const k = e?.key || e?.name || e?.path; if (k) out.push(k); if (out.length >= limit) break; }
      return out;
    }
    if (Array.isArray(it)) {                                           // B) array
      for (const e of it) { const k = e?.key || e?.name || e?.path; if (k) out.push(k); if (out.length >= limit) break; }
      return out;
    }
    if (it && Array.isArray(it.items)) {                                // C) object.items
      for (const e of it.items) { const k = e?.key || e?.name || e?.path; if (k) out.push(k); if (out.length >= limit) break; }
      return out;
    }
  }
  return out; // sin list() → no reventamos
}

async function readTicketsFromKeys(keys = [], max = 500) {
  const s = await _store();
  const out = [];
  for (const k of keys.slice(0, max)) {
    try { const raw = await s.get(k, { type:'text' }); if (!raw) continue; const t = JSON.parse(raw); if (t?.folio) out.push(t); } catch {}
  }
  return out;
}

function norm(str='') {
  return String(str || '').normalize('NFD').replace(/\p{Diacritic}/gu,'').trim().toLowerCase().replace(/\s+/g,'-');
}

module.exports = { keyForTicket, getTicket, saveTicket, listTicketKeys, readTicketsFromKeys, norm };
