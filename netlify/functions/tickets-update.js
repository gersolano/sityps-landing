import { getStore } from '@netlify/blobs';

export async function handler(event) {
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'PATCH') {
    return json(405, { error: 'Method not allowed' });
  }
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'JSON inválido' }); }

  const folio = body.folio || (event.queryStringParameters || {}).folio;
  if (!folio) return json(400, { error: 'Falta folio' });

  try {
    const store = getStore({ name: 'sityps' });
    const ticket = await store.get(`tickets/${folio}.json`, { type: 'json' });
    if (!ticket) return json(404, { error: 'No encontrado' });

    const allowed = ['estado', 'prioridad', 'asignadoA', 'notas'];
    const patch = {};
    for (const k of allowed) if (k in body) patch[k] = body[k];

    const now = new Date().toISOString();
    const actor = 'backoffice';

    const before = { estado: ticket.estado, prioridad: ticket.prioridad, asignadoA: ticket.asignadoA };
    Object.assign(ticket, patch);
    ticket.updatedAt = now;
    ticket.historico = ticket.historico || [];
    ticket.historico.push({ at: now, by: actor, action: 'update', notes: diffNote(before, patch) });

    await store.set(`tickets/${folio}.json`, JSON.stringify(ticket), {
      contentType: 'application/json; charset=utf-8',
    });

    return json(200, { ok: true, ticket });
  } catch (e) {
    console.error(e);
    return json(500, { error: 'No se pudo actualizar' });
  }
}

function diffNote(before, patch) {
  const parts = [];
  if ('estado' in patch && patch.estado !== before.estado) parts.push(`estado: ${before.estado} → ${patch.estado}`);
  if ('prioridad' in patch && patch.prioridad !== before.prioridad) parts.push(`prioridad: ${before.prioridad} → ${patch.prioridad}`);
  if ('asignadoA' in patch && patch.asignadoA !== before.asignadoA) parts.push(`asignadoA: ${before.asignadoA || '-'} → ${patch.asignadoA || '-'}`);
  return parts.join('; ');
}
function json(status, data) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(data) };
}
