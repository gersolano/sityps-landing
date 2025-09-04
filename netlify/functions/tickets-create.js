// netlify/functions/tickets-create.js
import { getStore } from '@netlify/blobs';
import nodemailer from 'nodemailer';

// genera folio
const folioId = () =>
  `T-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;

// mapea módulo → destinatarios (ajusta/expande cuando tengas más buzones)
function resolveRecipients(modulo) {
  const map = new Map([
    ['Secretaria de Organización, actas y acuerdos', process.env.TO_ACTAS],
  ]);
  const def = process.env.TICKETS_TO_DEFAULT;
  return (map.get(modulo) || def || '').split(',').map(s => s.trim()).filter(Boolean);
}

async function sendMail(folio, ticket) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SUBJECT_PREFIX } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return; // sin SMTP, no intentamos

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 465),
    secure: (SMTP_PORT || '465') === '465',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const to = resolveRecipients(ticket.modulo);
  if (!to.length) return;

  const subjPrefix = SUBJECT_PREFIX ? `[${SUBJECT_PREFIX}] ` : '';
  const subject = `${subjPrefix}Nuevo ticket ${folio} — ${ticket.modulo}`;

  const facil = ticket.facilidades;
  const facilTxt = facil
    ? `
Facilidades administrativas:
- Institución: ${facil.institucion}
- Cantidad solicitantes: ${facil.cantidadSolicitantes}
- Tipo de evento/incidencia: ${facil.tipoEvento}
- Días solicitados: ${facil.diasSolicitados ?? '-'}
- Fecha única: ${facil.fechaUnica ?? '-'}
- Periodos: ${
        Array.isArray(facil.periodos) && facil.periodos.length
          ? facil.periodos.map(p => `${p.desde} → ${p.hasta}`).join(', ')
          : '-'
      }
- Acuse RH subido: ${facil.acuseKey ? 'Sí' : 'No'}
`
    : '';

  const text =
`Folio: ${folio}
Creado: ${ticket.creadoEn}
Módulo: ${ticket.modulo}
Tipo: ${ticket.tipo}
Estado: ${ticket.estado}
Prioridad: ${ticket.prioridad}

Contacto:
- Nombre: ${ticket.nombre}
- Correo: ${ticket.correo}
- Teléfono: ${ticket.telefono || '-'}
- Unidad de adscripción: ${ticket.unidadAdscripcion || '-'}

Descripción:
${ticket.descripcion}

${facilTxt}
`;

  await transporter.sendMail({
    from: SMTP_USER,
    to,
    subject,
    text,
  });
}

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
    const data = JSON.parse(event.body || '{}');

    const required = ['nombre', 'correo', 'modulo', 'tipo', 'descripcion'];
    for (const k of required) {
      if (!data[k] || String(data[k]).trim() === '') {
        return { statusCode: 400, body: JSON.stringify({ ok: false, error: `Falta ${k}` }) };
      }
    }

    // validación de facilidades
    if (data.tipo === 'Facilidades administrativas') {
      const f = data.facilidades || {};
      const dias = Number(f.diasSolicitados || 0);
      if (!dias || dias < 1) {
        return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Indica número de días solicitados' }) };
      }
      if (dias === 1) {
        if (!f.fechaUnica) {
          return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Indica la fecha solicitada' }) };
        }
      } else {
        if (!Array.isArray(f.periodos) || f.periodos.length === 0) {
          return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Agrega al menos un periodo de fechas' }) };
        }
      }
      if (!f.confirmacionAcuseRH) {
        return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Confirma el acuse entregado a RH' }) };
      }
    }

    // Blobs: auto o manual
    const storeName = process.env.BLOBS_STORE_NAME || 'sityps-tickets';
    const opts = { name: storeName };
    if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_API_TOKEN) {
      opts.siteID = process.env.NETLIFY_SITE_ID;
      opts.token  = process.env.NETLIFY_API_TOKEN;
    }
    const store = getStore(opts);

    const folio = folioId();
    const now = new Date().toISOString();

    const ticket = {
      folio,
      creadoEn: now,
      estado: 'Abierto',
      prioridad: data.prioridad || 'Normal',
      nombre: data.nombre,
      correo: data.correo,
      telefono: data.telefono || '',
      curp: data.curp || '',
      rfc: data.rfc || '',
      unidadAdscripcion: data.unidadAdscripcion || '',
      modulo: data.modulo,
      tipo: data.tipo,
      descripcion: data.descripcion,
      facilidades: data.tipo === 'Facilidades administrativas' ? data.facilidades : null,
      adjuntos: Array.isArray(data.adjuntos) ? data.adjuntos : [],
      traza: [{ t: now, e: 'creado', por: data.nombre || 'visitante', detalle: '' }],
      destino: data.modulo || '',
    };

    await store.setJSON(`tickets/${folio}.json`, ticket);

    // enviar correo (no bloqueante)
    try { await sendMail(folio, ticket); } catch (e) { console.error('sendMail error:', e); }

    return { statusCode: 200, body: JSON.stringify({ ok: true, folio }) };
  } catch (err) {
    console.error('tickets-create error:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(err?.message || err) }) };
  }
}
