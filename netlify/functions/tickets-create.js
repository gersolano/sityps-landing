// netlify/functions/tickets-create.js
import { getStore } from '@netlify/blobs';
import nodemailer from 'nodemailer';

// ---------- utilidades ----------
const folioId = () =>
  `T-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;

const trimOrEmpty = (v) => (v == null ? '' : String(v).trim());

const parseISOorDMY = (s) => {
  if (!s) return null;
  const t = String(s).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  // DD/MM/YYYY
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
  if (m) {
    const [_, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
  }
  // como fallback, intentar Date
  const d = new Date(t);
  if (!isNaN(d)) {
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${d.getUTCFullYear()}-${mm}-${dd}`;
  }
  return null;
};

const normalizeModule = (body) =>
  trimOrEmpty(
    body.modulo ??
      body.moduloDestino ??
      body.secretaria ??
      body.secretariaDestino
  );

const normalizeTipo = (body) =>
  trimOrEmpty(body.tipo ?? body.tipoSolicitud);

const normalizeUnidad = (body) =>
  trimOrEmpty(body.unidadAdscripcion ?? body.unidad);

const normalizeAdjuntos = (body) =>
  Array.isArray(body.adjuntos)
    ? body.adjuntos
    : Array.isArray(body.attachments)
    ? body.attachments
    : Array.isArray(body.files)
    ? body.files
    : [];

// ---------- destinos por módulo ----------
function resolveRecipients(modulo) {
  const map = new Map([
    // ajusta / añade más buzones cuando te indiquen los correos
    ['Secretaria de Organización, actas y acuerdos', process.env.TO_ACTAS],
  ]);
  const def = process.env.TICKETS_TO_DEFAULT;
  return (map.get(modulo) || def || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------- correo ----------
async function sendMail(folio, ticket) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SUBJECT_PREFIX } =
    process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return;

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

  const f = ticket.facilidades;
  const facilTxt = f
    ? `
Facilidades administrativas:
- Institución: ${f.institucion}
- Cantidad de solicitantes: ${f.cantidadSolicitantes}
- Tipo de evento/incidencia: ${f.tipoEvento}
- Días solicitados: ${f.diasSolicitados ?? '-'}
- Fecha única: ${f.fechaUnica ?? '-'}
- Períodos: ${
        Array.isArray(f.periodos) && f.periodos.length
          ? f.periodos.map((p) => `${p.desde} → ${p.hasta}`).join(', ')
          : '-'
      }
- Acuse RH subido: ${f.acuseKey ? 'Sí' : 'No'}
`
    : '';

  const text = `Folio: ${folio}
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

  await transporter.sendMail({ from: SMTP_USER, to, subject, text });
}

// ---------- handler ----------
export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json', Allow: 'POST' },
        body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }),
      };
    }

    const body = JSON.parse(event.body || '{}');

    // Normalizar campos base
    const nombre = trimOrEmpty(body.nombre ?? body.name);
    const correo = trimOrEmpty(body.correo ?? body.email);
    const telefono = trimOrEmpty(body.telefono ?? body.phone);
    const curp = trimOrEmpty(body.curp);
    const rfc = trimOrEmpty(body.rfc);
    const unidadAdscripcion = normalizeUnidad(body);
    const modulo = normalizeModule(body);
    const tipo = normalizeTipo(body);
    const descripcion = trimOrEmpty(body.descripcion ?? body.descripcionCorta ?? body.descripcionLarga ?? body.desc);

    // Validaciones base
    for (const [k, v] of [
      ['nombre', nombre],
      ['correo', correo],
      ['modulo', modulo],
      ['tipo', tipo],
      ['descripcion', descripcion],
    ]) {
      if (!v) {
        return {
          statusCode: 400,
          body: JSON.stringify({ ok: false, error: `Falta ${k}` }),
        };
      }
    }

    // Normalizar facilidades (si aplica)
    let facilidades = null;
    if (tipo === 'Facilidades administrativas') {
      const fRaw =
        body.facilidades ?? body.fac ?? body.facilidadesAdmin ?? {};
      const institucion = trimOrEmpty(
        fRaw.institucion ?? fRaw.institución ?? fRaw.institution
      );
      const tipoEvento = trimOrEmpty(
        fRaw.evento ?? fRaw.tipoEvento ?? fRaw.incidencia
      );
      const cantidadSolicitantes = Number(
        fRaw.cantidadSolicitantes ?? fRaw.solicitantes ?? 0
      );
      const diasSolicitados = Number(
        fRaw.diasSolicitados ?? fRaw.dias ?? fRaw.numDias ?? 0
      );

      const fechaUnica = parseISOorDMY(fRaw.fechaUnica ?? fRaw.fecha);

      // periodos puede venir como {desde,hasta} o como array
      let periodos = [];
      const pRaw =
        fRaw.periodos ??
        fRaw.periodo ??
        fRaw.periodosSolicitados ??
        fRaw.rangos ??
        null;

      if (Array.isArray(pRaw)) {
        periodos = pRaw
          .map((p) => ({
            desde: parseISOorDMY(p.desde ?? p.from),
            hasta: parseISOorDMY(p.hasta ?? p.to),
          }))
          .filter((p) => p.desde && p.hasta);
      } else if (pRaw && typeof pRaw === 'object') {
        const desde = parseISOorDMY(pRaw.desde ?? pRaw.from);
        const hasta = parseISOorDMY(pRaw.hasta ?? pRaw.to);
        if (desde && hasta) periodos = [{ desde, hasta }];
      }

      const acuseKey =
        trimOrEmpty(fRaw.acuseKey ?? fRaw.acuse ?? fRaw.acuseBlobKey) || '';
      const acuseName =
        trimOrEmpty(fRaw.acuseName ?? fRaw.acuseFilename) || '';
      const confirmacionAcuseRH = Boolean(
        fRaw.confirmacionAcuseRH ??
          fRaw.acuseConfirm ??
          fRaw.confirmoAcuse ??
          fRaw.acuseRHConfirm ??
          fRaw.confirmacion
      );

      // Validación de negocio
      if (!diasSolicitados || diasSolicitados < 1) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            ok: false,
            error: 'Indica número de días solicitados',
          }),
        };
      }
      if (diasSolicitados === 1) {
        if (!fechaUnica) {
          return {
            statusCode: 400,
            body: JSON.stringify({
              ok: false,
              error: 'Indica la fecha solicitada',
            }),
          };
        }
      } else {
        if (!periodos.length) {
          return {
            statusCode: 400,
            body: JSON.stringify({
              ok: false,
              error: 'Agrega al menos un periodo de fechas',
            }),
          };
        }
      }
      if (!confirmacionAcuseRH) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            ok: false,
            error: 'Confirma el acuse entregado a RH',
          }),
        };
      }

      facilidades = {
        institucion,
        tipoEvento,
        cantidadSolicitantes,
        diasSolicitados,
        fechaUnica: fechaUnica || null,
        periodos,
        acuseKey,
        acuseName,
        confirmacionAcuseRH,
      };
    }

    // Adjuntos opcionales (no el acuse RH; esos metadatos van en facilidades)
    const adjuntos = normalizeAdjuntos(body);

    // --- Netlify Blobs ---
    const storeName = process.env.BLOBS_STORE_NAME || 'sityps-tickets';
    const opts = { name: storeName };

    // modo manual (build) por si la función no corre en Edge
    if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_API_TOKEN) {
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
      prioridad: trimOrEmpty(body.prioridad) || 'Normal',
      nombre,
      correo,
      telefono,
      curp,
      rfc,
      unidadAdscripcion,
      modulo,
      tipo,
      descripcion,
      facilidades,
      adjuntos,
      traza: [{ t: now, e: 'creado', por: nombre || 'visitante', detalle: '' }],
      destino: modulo,
    };

    // Persistir JSON del ticket
    await store.setJSON(`tickets/${folio}.json`, ticket);

    // Correo (no bloqueante)
    try {
      await sendMail(folio, ticket);
    } catch (e) {
      console.error('sendMail error:', e);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, folio }),
    };
  } catch (err) {
    console.error('tickets-create error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: String(err?.message || err) }),
    };
  }
}
