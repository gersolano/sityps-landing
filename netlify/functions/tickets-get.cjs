'use strict';

const { getTicket } = require('./_store.cjs');

function j(status, body) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  try {
    const u = new URL(event.rawUrl || `http://localhost${event.path}?${event.queryStringParameters||''}`);
    const folio = String(u.searchParams.get('folio') || '').trim();
    if (!folio) return j(400, { ok:false, error:'Falta folio' });
    const t = await getTicket(folio);
    if (!t) return j(404, { ok:false, error:'Ticket no encontrado' });
    return j(200, { ok:true, ticket: t });
  } catch (e) {
    console.error('tickets-get', e);
    return j(500, { ok:false, error: e.message || 'Error' });
  }
};
