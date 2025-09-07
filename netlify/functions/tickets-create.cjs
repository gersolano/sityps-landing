/* eslint-disable */
const { getStore } = require("@netlify/blobs");
const nodemailer = require("nodemailer");

/* ===== Utils ===== */
function nowISO() { return new Date().toISOString(); }
function isEmail(x) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(x || "").trim()); }
function splitEmails(value) {
  return String(value || "")
    .split(/[;,]/g)
    .map((s) => s.trim())
    .filter(isEmail);
}
function uniq(arr) { return [...new Set((arr || []).filter(Boolean))]; }
function pad2(n) { return String(n).padStart(2, "0"); }
function yyyymmdd(d = new Date()) {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}
function random4() { return Math.random().toString(36).slice(2, 6).toUpperCase(); }
function buildFolio() { return `T-${yyyymmdd()}-${random4()}`; }
function preview(text, n = 240) { const s = String(text || ""); return s.length > n ? s.slice(0, n) + "…" : s; }
function safe(x) {
  return String(x ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

function normalizeFacilidades(fac) {
  if (!fac || typeof fac !== "object") return null;
  const cantidadSolicitantes =
    Number(fac.cantidadSolicitantes ?? fac.cantidad ?? fac.solicitantes ?? 1) || 1;

  const diasSolicitados = Number(fac.diasSolicitados || 0) || 0;
  let fechasSolicitadas = "";
  if (diasSolicitados === 1 && fac.fecha) {
    fechasSolicitadas = String(fac.fecha);
  } else if (diasSolicitados > 1 && fac.periodo?.desde && fac.periodo?.hasta) {
    fechasSolicitadas = `${fac.periodo.desde} a ${fac.periodo.hasta}`;
  } else if (fac.fechasSolicitadas) {
    fechasSolicitadas = String(fac.fechasSolicitadas);
  }

  return {
    institucion: fac.institucion || "",
    tipoEvento: fac.tipoEvento || fac.evento || "",
    cantidadSolicitantes,
    diasSolicitados,
    fechasSolicitadas,
    fecha: fac.fecha || null,
    periodo: fac.periodo || null,
    acuseKey: fac.acuseKey || "",
    acuseName: fac.acuseName || "",
    acuseConfirm: Boolean(fac.acuseConfirm),
  };
}

/* ===== Correo ===== */
function makeTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("Faltan SMTP_HOST/SMTP_USER/SMTP_PASS");
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

const MOD_TO_ENV = [
  { match: /afiliaci|organizaci|actas|acuerdos/i, env: "TO_AFILIACION" },
  { match: /laborales|asuntos/i, env: "TO_LABORALES" },
  { match: /finanzas/i, env: "TO_FINANZAS" },
  { match: /formaci|capacitaci/i, env: "TO_FORMACION" },
  { match: /escalaf/i, env: "TO_ESCALAFON" },
  { match: /cr[eé]dit|prestacion|vivienda/i, env: "TO_PRESTACIONES" },
  { match: /prensa|propaganda|relacion/i, env: "TO_PRENSA" },
  { match: /cultura|deport/i, env: "TO_CULTURA" },
  { match: /mujer|equidad/i, env: "TO_EQUIDAD" },
  { match: /honor|justicia/i, env: "TO_HONOR_JUSTICIA" },
  { match: /electoral/i, env: "TO_ELECTORAL" },
  { match: /consultorio/i, env: "TO_CONSULTORIOS" },
  { match: /soporte|t[eé]cnico/i, env: "TO_SOPORTE" },
];

function computeRecipientsOnCreate(ticket) {
  const dest = [];
  if (process.env.TICKETS_TO_DEFAULT) dest.push(...splitEmails(process.env.TICKETS_TO_DEFAULT));
  if (isEmail(ticket.correo)) dest.push(ticket.correo);
  const modulo = (ticket.moduloDestino || ticket.modulo || "").toLowerCase();
  for (const rule of MOD_TO_ENV) {
    if (rule.match.test(modulo)) {
      const envVal = process.env[rule.env];
      if (envVal) dest.push(...splitEmails(envVal));
      break;
    }
  }
  return uniq(dest);
}

/* ===== Plantilla correo ===== */
function baseStyles() {
  return `
    .wrap{max-width:640px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb}
    .hdr{background:#7a0c0c;color:#fff;padding:16px 20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial}
    .title{font-size:18px;font-weight:700;margin:0}
    .body{padding:20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial;color:#111827}
    .kv{width:100%;border-collapse:collapse;margin:8px 0 16px}
    .kv th{text-align:left;font-weight:600;color:#374151;padding:6px 0;white-space:nowrap;vertical-align:top;width:190px}
    .kv td{color:#111827;padding:6px 0}
    .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;background:#fee2e2;color:#991b1b;border:1px solid #fecaca}
    .muted{color:#6b7280}
    .section{margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb}
    .foot{margin-top:18px;font-size:12px;color:#6b7280}
    @media (prefers-color-scheme: dark){
      body{background:#0b0b0b}
      .wrap{background:#111827;border-color:#374151}
      .body{color:#e5e7eb}
      .kv th{color:#9ca3af}
      .kv td{color:#e5e7eb}
      .muted{color:#9ca3af}
      .foot{color:#9ca3af}
    }
  `;
}
function htmlTicketBlock(ticket) {
  const facil = ticket.facilidades
    ? `
    <div class="section">
      <div class="muted" style="font-weight:600;margin-bottom:6px">Facilidades administrativas</div>
      <table class="kv">
        <tr><th>Institución</th><td>${safe(ticket.facilidades.institucion || "—")}</td></tr>
        <tr><th>Evento / Incidencia</th><td>${safe(ticket.facilidades.tipoEvento || "—")}</td></tr>
        <tr><th>Solicitantes</th><td>${safe(ticket.facilidades.cantidadSolicitantes || 1)}</td></tr>
        <tr><th>Fechas solicitadas</th><td>${safe(ticket.facilidades.fechasSolicitadas || "—")}</td></tr>
      </table>
    </div>`
    : "";

  return `
    <table class="kv">
      <tr><th>Folio</th><td><span class="pill">${safe(ticket.folio)}</span></td></tr>
      <tr><th>Fecha</th><td>${safe(new Date(ticket.submittedAt).toLocaleString("es-MX"))}</td></tr>
      <tr><th>Módulo</th><td>${safe(ticket.moduloDestino || ticket.modulo || "—")}</td></tr>
      <tr><th>Tipo</th><td>${safe(ticket.tipo || "—")}</td></tr>
      <tr><th>Solicitante</th><td>${safe(ticket.nombre || "—")} &lt;${safe(ticket.correo || "—")}&gt;</td></tr>
      <tr><th>Unidad</th><td>${safe(ticket.unidadAdscripcion || ticket.unidad || "—")}</td></tr>
      <tr><th>Teléfono</th><td>${safe(ticket.telefono || "—")}</td></tr>
      <tr><th>Descripción</th><td>${safe(preview(ticket.descripcion || "—"))}</td></tr>
    </table>
    ${facil}
  `;
}
function buildHtmlEmail({ title, intro, ticket, footerNote }) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<style>${baseStyles()}</style></head>
<body>
  <div class="wrap">
    <div class="hdr"><h1 class="title">${safe(title)}</h1></div>
    <div class="body">
      <p>${safe(intro)}</p>
      ${htmlTicketBlock(ticket)}
      <div class="foot">${safe(footerNote || "Este es un aviso automático del sistema SITYPS.")}</div>
    </div>
  </div>
</body></html>`;
}

/* ===== Handler ===== */
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const body = JSON.parse(event.body || "{}");

    const nombre = String(body.nombre || "").trim();
    const correo = String(body.correo || "").trim();
    const telefono = String(body.telefono || "").trim();
    const unidadAdscripcion = String(body.unidad || body.unidadAdscripcion || "").trim();
    const curp = String(body.curp || "").trim();
    const rfc = String(body.rfc || "").trim();
    const moduloDestino = String(body.modulo || body.moduloDestino || "").trim();
    const tipo = String(body.tipo || "").trim();
    const descripcion = String(body.descripcion || "").trim();
    const adjuntos = Array.isArray(body.adjuntos) ? body.adjuntos : [];

    if (!nombre) return { statusCode: 400, body: JSON.stringify({ ok:false, error:"Indica tu nombre" }) };
    if (!isEmail(correo)) return { statusCode: 400, body: JSON.stringify({ ok:false, error:"Correo inválido" }) };
    if (!moduloDestino) return { statusCode: 400, body: JSON.stringify({ ok:false, error:"Selecciona la secretaría/módulo" }) };
    if (!tipo) return { statusCode: 400, body: JSON.stringify({ ok:false, error:"Selecciona el tipo de solicitud" }) };
    if (!descripcion) return { statusCode: 400, body: JSON.stringify({ ok:false, error:"Agrega una descripción" }) };

    let facilidades = null;
    if (/facilidad|facilidades/i.test(tipo)) {
      facilidades = normalizeFacilidades(body.facilidades);
      if (!facilidades) return { statusCode: 400, body: JSON.stringify({ ok:false, error:"Completa los datos de facilidades" }) };
      if (facilidades.diasSolicitados <= 0) return { statusCode: 400, body: JSON.stringify({ ok:false, error:"Indica el número de días solicitados" }) };
      if (facilidades.diasSolicitados === 1 && !facilidades.fecha) return { statusCode: 400, body: JSON.stringify({ ok:false, error:"Indica la fecha solicitada" }) };
      if (facilidades.diasSolicitados > 1 && !(facilidades.periodo?.desde && facilidades.periodo?.hasta)) {
        return { statusCode: 400, body: JSON.stringify({ ok:false, error:"Agrega el periodo de fechas" }) };
      }
      if (!facilidades.acuseConfirm) return { statusCode: 400, body: JSON.stringify({ ok:false, error:"Confirma el acuse entregado a RH" }) };
    }

    const folio = buildFolio();
    const ticket = {
      folio,
      submittedAt: nowISO(),
      moduloDestino, tipo,
      nombre, correo, telefono, unidadAdscripcion, curp, rfc,
      descripcion,
      prioridad: "Media",
      estado: "nuevo",
      asignadoA: "",
      facilidades: facilidades || undefined,
      adjuntos,
      historico: [{ at: nowISO(), by: "sistema", action: "creado", value: "nuevo" }],
    };

    const opts = process.env.BLOBS_STORE_NAME ? { name: process.env.BLOBS_STORE_NAME } : undefined;
    const store = getStore(opts);
    await store.set(`tickets/${folio}.json`, JSON.stringify(ticket, null, 2), { contentType: "application/json" });

    // Correo
    let mailOk = false, mailError = "";
    try {
      const toList = computeRecipientsOnCreate(ticket);
      if (toList.length > 0) {
        const transport = makeTransport();
        const pref = process.env.SUBJECT_PREFIX || "SITYPS";
        const subject = `${pref} · Ticket ${ticket.folio} — ${ticket.nombre} — ${ticket.tipo || "Solicitud"}`;
        const text =
          `Folio: ${ticket.folio}\nFecha: ${new Date(ticket.submittedAt).toLocaleString("es-MX")}\n` +
          `Módulo: ${ticket.moduloDestino}\nTipo: ${ticket.tipo}\n` +
          `Solicitante: ${ticket.nombre} <${ticket.correo}>\nUnidad: ${ticket.unidadAdscripcion}\n` +
          `Desc: ${preview(ticket.descripcion)}\n` +
          (ticket.facilidades ? `\n[Facilidades]\nInstitución: ${ticket.facilidades.institucion}\nEvento: ${ticket.facilidades.tipoEvento}\n` +
          `Solicitantes: ${ticket.facilidades.cantidadSolicitantes}\nFechas: ${ticket.facilidades.fechasSolicitadas}\n` : ``) +
          `\nTe contactaremos a la brevedad.`;

        const html = buildHtmlEmail({
          title: "Ticket recibido",
          intro: "Hemos recibido tu solicitud. Te contactaremos a la brevedad.",
          ticket,
          footerNote: "Si no esperabas este correo, por favor ignóralo.",
        });

        await transport.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: toList.join(", "),
          subject,
          text,
          html,
        });
        mailOk = true;
      } else {
        mailError = "Sin destinatarios (revisa TICKETS_TO_DEFAULT)";
      }
    } catch (e) {
      mailError = String(e.message || e);
    }

    // Persistir último correo
    ticket.lastMail = { ok: mailOk, at: nowISO(), subject: (mailOk ? `${process.env.SUBJECT_PREFIX || "SITYPS"} · Ticket ${ticket.folio} — ${ticket.nombre} — ${ticket.tipo || "Solicitud"}` : undefined) };
    await store.set(`tickets/${folio}.json`, JSON.stringify(ticket, null, 2), { contentType: "application/json" });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, folio, mailOk, ...(mailOk ? {} : { mailError }) }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok:false, error:String(err.message||err) }),
    };
  }
};
