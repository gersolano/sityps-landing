'use strict';

const mailer = require('./_mailer.cjs'); // si no usas correo, no rompe
const { getBlobsStore } = require('./_blobs.cjs');
const { STORE_NAME, TICKETS_PREFIX } = require('./_cfg.cjs');

function j(status, body) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) };
}
const keyForTicket = (folio) => `${TICKETS_PREFIX}${folio}.json`;

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return j(200, { ok:true });
    if (event.httpMethod !== 'POST')   return j(405, { ok:false, error:'Method Not Allowed' });

    const p = JSON.parse(event.body || '{}');
    const folio    = String(p.folio || '').trim();
    const toModulo = String(p.toModulo || '').trim();
    const editor   = String(p._editor || 'backoffice');

    if (!folio)    return j(400, { ok:false, error:'Falta folio' });
    if (!toModulo) return j(400, { ok:false, error:'Falta destino' });

    const store = await getBlobsStore(STORE_NAME);
    const key   = keyForTicket(folio);
    const raw   = await store.get(key, { type:'text' });
    if (!raw) return j(404, { ok:false, error:'Ticket no encontrado' });

    const cur = JSON.parse(raw);
    const was = cur.modulo || '';
    if (was === toModulo) return j(200, { ok:true, transferred:false, ticket: cur });

    const when = new Date().toISOString();
    const cambios = [{ campo:'modulo', antes: was || '—', despues: toModulo }];
    const historial = Array.isArray(cur.historial) ? cur.historial.slice() : [];
    historial.push({ por: editor, fecha: when, cambios });

    const ticket = { ...cur, modulo: toModulo, updatedAt: when, historial };
    await store.set(key, JSON.stringify(ticket), { contentType: 'application/json; charset=utf-8' });

    if (p.notify === '1' && (cur.correo || cur.email) && typeof mailer?.sendMail === 'function') {
      try {
        const subject = `Ticket ${ticket.folio}: transferido a ${toModulo}`;
        const html = typeof mailer.renderTransferHTML === 'function'
          ? mailer.renderTransferHTML(ticket, { from: was, to: toModulo })
          : `<p>Tu ticket <b>${ticket.folio}</b> fue transferido a <b>${toModulo}</b>.</p>`;
        await mailer.sendMail({ to: cur.correo || cur.email, subject, html, text: subject });
      } catch (e) {
        console.error('MAIL ERROR (transfer):', e);
      }
    }

    return j(200, { ok:true, transferred:true, ticket });
  } catch (e) {
    console.error('tickets-transfer', e);
    return j(500, { ok:false, error: e.message || 'Error' });
  }
};
