// netlify/functions/ticket.cjs
const { getTicketStore } = require('./_store.cjs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const folio = (event.queryStringParameters && event.queryStringParameters.folio) || '';
    if (!folio) return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Falta folio' }) };

    const store = await getTicketStore();
    const doc = await store.getJSON(`tickets/${folio}.json`);
    if (!doc) return { statusCode: 404, body: JSON.stringify({ ok: false, error: 'No encontrado' }) };

    return { statusCode: 200, body: JSON.stringify({ ok: true, ticket: doc }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};
