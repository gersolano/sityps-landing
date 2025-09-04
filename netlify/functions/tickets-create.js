// netlify/functions/tickets-create.js
// ESM (Node 20): export named handler
import { getStore } from '@netlify/blobs';

// Utilidad: folio legible y único
const folioId = () =>
  `T-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const data = JSON.parse(event.body || '{}');

    // Reglas mínimas
    const required = ['nombre', 'correo', 'modulo', 'tipo', 'descripcion'];
    for (const k of required) {
      if (!data[k] || String(data[k]).trim() === '') {
        return {
          statusCode: 400,
          body: JSON.stringify({ ok: false, error: `Falta ${k}` }),
        };
      }
    }

    // Reglas extra si es "Facilidades administrativas"
    if (data.tipo === 'Facilidades administrativas') {
      if (!data.facilidades) {
        return {
          statusCode: 400,
          body: JSON.stringify({ ok: false, error: 'Faltan datos de facilidades' }),
        };
      }
      const f = data.facilidades;
      if (!Array.isArray(f.periodos) || f.periodos.length === 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ ok: false, error: 'Agrega al menos un periodo' }),
        };
      }
      if (!f.confirmacionAcuseRH) {
        return {
          statusCode: 400,
          body: JSON.stringify({ ok: false, error: 'Confirma el acuse entregado a RH' }),
        };
      }
    }

    // Preparar tienda de Blobs (auto ó manual)
    const storeName = process.env.BLOBS_STORE_NAME || 'sityps-tickets';
    const opts = { name: storeName };
    if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_API_TOKEN) {
      // Modo manual si existe token y siteID
      opts.siteID = process.env.NETLIFY_SITE_ID;
      opts.token = process.env.NETLIFY_API_TOKEN;
    }
    const store = getStore(opts);

    const folio = folioId();
    const now = new Date().toISOString();

    const ticket = {
      folio,
      creadoEn: now,
      estado: 'Abierto',
      prioridad: data.prioridad || 'Normal',
      // Datos de contacto
      nombre: data.nombre,
      correo: data.correo,
      telefono: data.telefono || '',
      curp: data.curp || '',
      rfc: data.rfc || '',
      unidadAdscripcion: data.unidadAdscripcion || '',
      // Clasificación
      modulo: data.modulo,
      tipo: data.tipo,
      descripcion: data.descripcion,
      // Facilidad (si aplica)
      facilidades:
        data.tipo === 'Facilidades administrativas' ? data.facilidades : null,
      // Traza básica
      traza: [
        { t: now, e: 'creado', por: data.nombre || 'visitante', detalle: '' },
      ],
      // Destino sugerido (para filtros del backoffice)
      destino: data.destino || data.modulo || '',
      // Archivos (si el cliente subió acuse antes)
      adjuntos: Array.isArray(data.adjuntos) ? data.adjuntos : [],
    };

    await store.setJSON(`tickets/${folio}.json`, ticket);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, folio }),
    };
  } catch (err) {
    console.error('tickets-create error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: String(err?.message || err),
      }),
    };
  }
}
