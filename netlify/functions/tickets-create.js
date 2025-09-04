import { getStore } from '@netlify/blobs';

/**
 * Crea un ticket y lo guarda en Netlify Blobs (store "sityps").
 * Espera JSON:
 * {
 *   nombre, correo, telefono,
 *   moduloDestino,            // p.ej. "escalafon", "organizacion", etc.
 *   tipo,                     // p.ej. "facilidades", "conflicto-laboral", ...
 *   unidadAdscripcion, descripcion,
 *   curp, rfc,
 *   acuseKey,                 // clave devuelta por /.netlify/functions/acuse-upload (opcional)
 *   facilidades: {            // solo cuando tipo === "facilidades"
 *     institucion,            // "Servicios de Salud de Oaxaca" | "Servicios de Salud IMSS-Bienestar"
 *     cantidadSolicitantes,   // número
 *     fechasSolicitadas,      // string legible, ej: "2025-09-10 → 2025-09-12, 2025-09-20"
 *     tipoEvento              // string
 *   }
 * }
 */
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
    nombre,
    correo,
    telefono,
    moduloDestino,
    tipo,
    unidadAdscripcion,
    descripcion,
    curp,
    rfc,
    acuseKey = '',
    facilidades, // { institucion, cantidadSolicitantes, fechasSolicitadas, tipoEvento }
  } = body;

  // Validaciones mínimas
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

    acuseKey: acuseKey || '',

    estado: 'nuevo',
    prioridad: 'Media',
    asignadoA: '',

    historico: [{ at: now, by: 'sistema', action: 'creado' }],
  };

  // Facilidades administrativas (opcional)
  if (ticket.tipo === 'facilidades' && facilidades && typeof facilidades === 'object') {
    ticket.facilidades = {
      institucion: facilidades.institucion || '',
      cantidadSolicitantes: Number(facilidades.cantidadSolicitantes || 1),
      fechasSolicitadas: facilidades.fechasSolicitadas || '',
      tipoEvento: facilidades.tipoEvento || '',
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

/* ---------------- utilidades --------------- */
function json(status, data) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(data),
  };
}

function genFolio() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `T-${ts}-${rnd}`;
}
