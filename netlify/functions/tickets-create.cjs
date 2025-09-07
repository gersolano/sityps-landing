 eslint-disable 
const { getStore } = require(@netlifyblobs);
const nodemailer = require(nodemailer);

 =========================
   Utilidades
   ========================= 
function nowISO() { return new Date().toISOString(); }
function isEmail(x) { return ^[^s@]+@[^s@]+.[^s@]+$.test(String(x  ).trim()); }
function splitEmails(value) {
  return String(value  )
    .split([;,]g)
    .map((s) = s.trim())
    .filter(isEmail);
}
function uniq(arr) { return [...new Set((arr  []).filter(Boolean))]; }
function pad2(n) { return String(n).padStart(2, 0); }
function yyyymmdd(d = new Date()) {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}
function random4() { return Math.random().toString(36).slice(2, 6).toUpperCase(); }
function buildFolio() { return `T-${yyyymmdd()}-${random4()}`; }

function preview(text, n = 240) {
  const s = String(text  );
  return s.length  n  s.slice(0, n) + …  s;
}

 Normaliza datos de “facilidades administrativas” y arma la cadena de fechas 
function normalizeFacilidades(fac) {
  if (!fac  typeof fac !== object) return null;
  const cantidadSolicitantes =
    Number(fac.cantidadSolicitantes  fac.cantidad  fac.solicitantes  1)  1;

  const diasSolicitados = Number(fac.diasSolicitados  0)  0;
  let fechasSolicitadas = ;
  if (diasSolicitados === 1 && fac.fecha) {
    fechasSolicitadas = String(fac.fecha);
  } else if (diasSolicitados  1 && fac.periodo && fac.periodo.desde && fac.periodo.hasta) {
    fechasSolicitadas = `${fac.periodo.desde} a ${fac.periodo.hasta}`;
  } else if (fac.fechasSolicitadas) {
    fechasSolicitadas = String(fac.fechasSolicitadas);
  }

  return {
    institucion fac.institucion  ,
    tipoEvento fac.tipoEvento  fac.evento  ,
    cantidadSolicitantes,
    diasSolicitados,
    fechasSolicitadas,
    fecha fac.fecha  null,
    periodo fac.periodo  null,
    acuseKey fac.acuseKey  ,
    acuseName fac.acuseName  ,
    acuseConfirm Boolean(fac.acuseConfirm),
  };
}

 =========================
   Correo
   ========================= 
function makeTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT  465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host  !user  !pass) {
    throw new Error(Faltan SMTP_HOSTSMTP_USERSMTP_PASS);
  }
  return nodemailer.createTransport({
    host,
    port,
    secure port === 465,  465 = SSL; 587 = STARTTLS
    auth { user, pass },
  });
}

 Mapa opcional para (futuro) ruteo por módulo; hoy se ignora si no hay ENV 
const MOD_TO_ENV = [
  { match afiliaciorganizaciactasacuerdosi, env TO_AFILIACION },
  { match laboralesasuntosi, env TO_LABORALES },
  { match finanzasi, env TO_FINANZAS },
  { match formacicapacitacii, env TO_FORMACION },
  { match escalafi, env TO_ESCALAFON },
  { match cr[eé]ditprestacionviviendai, env TO_PRESTACIONES },
  { match prensapropagandarelacioni, env TO_PRENSA },
  { match culturadeporti, env TO_CULTURA },
  { match mujerequidadi, env TO_EQUIDAD },
  { match honorjusticiai, env TO_HONOR_JUSTICIA },
  { match electorali, env TO_ELECTORAL },
  { match consultorioi, env TO_CONSULTORIOS },
  { match soportet[eé]cnicoi, env TO_SOPORTE },
];

 Receptores fallback + solicitante + (opcional) módulo si existe env 
function computeRecipientsOnCreate(ticket) {
  const dest = [];

   Fallback global (obligatorio hoy)
  if (process.env.TICKETS_TO_DEFAULT) {
    dest.push(...splitEmails(process.env.TICKETS_TO_DEFAULT));
  }

   Copia al solicitante
  if (isEmail(ticket.correo)) {
    dest.push(ticket.correo);
  }

   (Opcional futuro) ruteo por módulo si ya hay env configurado
  const modulo = (ticket.moduloDestino  ticket.modulo  ).toLowerCase();
  for (const rule of MOD_TO_ENV) {
    if (rule.match.test(modulo)) {
      const envVal = process.env[rule.env];
      if (envVal) dest.push(...splitEmails(envVal));
      break;
    }
  }

  return uniq(dest);
}

function buildMailOnCreate(ticket) {
  const pref = process.env.SUBJECT_PREFIX  SITYPS;
  const subject = `[${pref}] Ticket ${ticket.folio} recibido`;
  const l1 = `Folio ${ticket.folio}n`;
  const l2 = `Fecha ${new Date(ticket.submittedAt).toLocaleString(es-MX)}n`;
  const l3 = `Módulo ${ticket.moduloDestino  ticket.modulo  —}n`;
  const l4 = `Tipo ${ticket.tipo  —}n`;
  const l5 = `Solicitante ${ticket.nombre  —} (${ticket.correo  —})n`;
  const l6 = `Teléfono ${ticket.telefono  —}  Unidad ${ticket.unidadAdscripcion  ticket.unidad  —}n`;
  const l7 = `Descripción ${preview(ticket.descripcion  —)}n`;

  let facil = ;
  if (ticket.facilidades) {
    const f = ticket.facilidades;
    facil =
      `n[Facilidades administrativas]n` +
      `Institución ${f.institucion  —}n` +
      `EventoIncidencia ${f.tipoEvento  —}n` +
      `Solicitantes ${f.cantidadSolicitantes  1}n` +
      `Días solicitados ${f.diasSolicitados  0}n` +
      `Fechas solicitadas ${f.fechasSolicitadas  —}n` +
      `Acuse RH ${f.acuseConfirm  (f.acuseName  f.acuseKey  Sí)  No marcado}n`;
  }

  const text =
    `${l1}${l2}${l3}${l4}${l5}${l6}n${l7}${facil}n` +
    `---nTe contactaremos a la brevedad.n` +
    `Backoffice buscar por folio ${ticket.folio}n`;

  return { subject, text };
}

 =========================
   Handler
   ========================= 
exports.handler = async (event) = {
  if (event.httpMethod !== POST) {
    return { statusCode 405, body Method Not Allowed };
  }

  try {
    const body = JSON.parse(event.body  {});

     Campos generales
    const nombre = String(body.nombre  ).trim();
    const correo = String(body.correo  ).trim();
    const telefono = String(body.telefono  ).trim();
    const unidadAdscripcion = String(body.unidad  body.unidadAdscripcion  ).trim();
    const curp = String(body.curp  ).trim();
    const rfc = String(body.rfc  ).trim();
    const moduloDestino = String(body.modulo  body.moduloDestino  ).trim();
    const tipo = String(body.tipo  ).trim();
    const descripcion = String(body.descripcion  ).trim();
    const adjuntos = Array.isArray(body.adjuntos)  body.adjuntos  [];

     Validaciones mínimas
    if (!nombre) return { statusCode 400, body JSON.stringify({ ok false, error Indica tu nombre }) };
    if (!isEmail(correo)) return { statusCode 400, body JSON.stringify({ ok false, error Correo inválido }) };
    if (!moduloDestino) return { statusCode 400, body JSON.stringify({ ok false, error Selecciona la secretaríamódulo }) };
    if (!tipo) return { statusCode 400, body JSON.stringify({ ok false, error Selecciona el tipo de solicitud }) };
    if (!descripcion) return { statusCode 400, body JSON.stringify({ ok false, error Agrega una descripción }) };

     Facilidades (si aplica)
    let facilidades = null;
    if (facilidadfacilidadesi.test(tipo)) {
      facilidades = normalizeFacilidades(body.facilidades);

      if (!facilidades) {
        return { statusCode 400, body JSON.stringify({ ok false, error Completa los datos de facilidades }) };
      }
      if (facilidades.diasSolicitados = 0) {
        return { statusCode 400, body JSON.stringify({ ok false, error Indica el número de días solicitados }) };
      }
      if (facilidades.diasSolicitados === 1 && !facilidades.fecha) {
        return { statusCode 400, body JSON.stringify({ ok false, error Indica la fecha solicitada }) };
      }
      if (facilidades.diasSolicitados  1 && !(facilidades.periodo.desde && facilidades.periodo.hasta)) {
        return { statusCode 400, body JSON.stringify({ ok false, error Agrega el periodo de fechas }) };
      }
      if (!facilidades.acuseConfirm) {
        return { statusCode 400, body JSON.stringify({ ok false, error Confirma el acuse entregado a RH }) };
      }
    }

     Armar ticket
    const folio = buildFolio();
    const ticket = {
      folio,
      submittedAt nowISO(),
      moduloDestino,
      tipo,
      nombre,
      correo,
      telefono,
      unidadAdscripcion,
      curp,
      rfc,
      descripcion,
      prioridad Media,
      estado nuevo,
      asignadoA ,
      facilidades facilidades  undefined,
      adjuntos,
      historico [{ at nowISO(), by sistema, action creado, value nuevo }],
    };

     Guardar en Netlify Blobs
    const opts = process.env.BLOBS_STORE_NAME  { name process.env.BLOBS_STORE_NAME }  undefined;
    const store = getStore(opts);
    const key = `tickets${folio}.json`;
    await store.set(key, JSON.stringify(ticket, null, 2), { contentType applicationjson });

     Enviar correo (no bloqueante del éxito)
    let mailOk = false, mailError = ;
    try {
      const toList = computeRecipientsOnCreate(ticket);
      if (toList.length  0) {
        const { subject, text } = buildMailOnCreate(ticket);
        const transport = makeTransport();
        await transport.sendMail({
          from process.env.SMTP_FROM  process.env.SMTP_USER,
          to toList.join(, ),
          subject,
          text,
        });
        mailOk = true;
      } else {
        mailError = Sin destinatarios revisa TICKETS_TO_DEFAULT;
      }
    } catch (e) {
      mailError = String(e.message  e);
    }

    return {
      statusCode 200,
      headers { content-type applicationjson },
      body JSON.stringify({ ok true, folio, mailOk, ...(mailOk  {}  { mailError }) }),
    };
  } catch (err) {
    return {
      statusCode 500,
      headers { content-type applicationjson },
      body JSON.stringify({ ok false, error String(err.message  err) }),
    };
  }
};
