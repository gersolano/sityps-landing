import { getStore } from '@netlify/blobs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'JSON inválido' });
  }

  const {
    nombre, correo, telefono,
    moduloDestino,   // ej: "escalafon"
    tipo,            // ej: "facilidades"
    unidadAdscripcion,
    descripcion,
    curp, rfc,
    facilidades,     // { cantidadSolicitantes, fechasSolicitadas, tipoEvento, institucion }
  } = body;

  if (!nombre || !correo || !moduloDestino || !tipo || !descripcion) {
    return json(400, { error: 'Faltan campos obligatorios' });
  }

  const folio = genFolio();
  const now = new Date().toISOString();

  const ticket = {
    folio,
    submittedAt: now,
    updatedAt: now,
    moduloDestino: String(moduloDestino).toLowerCase(),
    tipo: String(tipo).toLowerCase(),
    nombre,
    correo,
    telefono: telefono || '',
    unidadAdscripcion: unidadAdscripcion || '',
    descripcion,
    curp: (curp || '').toUpperCase(),
    rfc: (rfc || '').toUpperCase(),
    estado: 'nuevo',
    prioridad: 'Media',
    asignadoA: '',
    historico: [{ at: now, by: 'sistema', action: 'creado' }],
  };

  if (facilidades && typeof facilidades === 'object') {
    ticket.facilidades = {
      cantidadSolicitantes: Number(facilidades.cantidadSolicitantes || 1),
      fechasSolicitadas: facilidades.fechasSolicitadas || '',
      tipoEvento: facilidades.tipoEvento || '',
      institucion: facilidades.institucion || '',
    };
  }

  try {
    const store = getStore({ name: 'sityps' });
    await store.set(`tickets/${folio}.json`, JSON.stringify(ticket), {
      contentType: 'application/json; charset=utf-8',
    });
    return json(200, { ok: true, ticket });
  } catch (e) {
    console.error(e);
    return json(500, { error: 'No se pudo guardar el ticket' });
  }
}

function json(status, data) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(data) };
}
function genFolio() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `T-${ts}-${rnd}`;
}
