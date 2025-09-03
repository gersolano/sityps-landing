// netlify/functions/ticket.cjs
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

/* ---------- helpers JSON ---------- */
function j(code, ok, message, extra = {}) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ ok, message, ...extra }),
  };
}

/* ---------- carga config opcional ---------- */
let CONFIG = {};
try {
  const cfgPath = path.join(__dirname, "..", "..", "sityps.config.json");
  CONFIG = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
} catch { CONFIG = {}; }

/* ---------- catálogos base ---------- */
const MOD_CODES = {
  "dashboard": "DSH",
  "afiliacion": "AFI",
  "cuotas": "CUO",
  "finanzas": "FIN",
  "demandas": "DEM",
  "formacion": "FOR",
  "escalafon": "ESC",
  "prestaciones": "PRE",
  "prensa": "PRN",
  "deporte-cultura": "DPC",
  "consultorios": "CON",
  "miscelanea": "MIS",
  "honor-justicia": "HON",
  "electoral": "ELE",
  "regiones": "REG",
  "admin": "ADM",
  "soporte": "SOP",
};

const DEFAULT_TIPOS = [
  { id: "conflicto-laboral", nombre: "Conflicto laboral", modulo: "demandas" },
  { id: "actualizacion-datos", nombre: "Alta/Baja/Actualización de datos", modulo: "afiliacion" },
  { id: "cuotas", nombre: "Cuotas/Descuentos/Recibos", modulo: "cuotas" },
  { id: "pagos-proveedores", nombre: "Pagos/Proveedores/Viáticos/Laudos", modulo: "finanzas" },
  { id: "capacitacion", nombre: "Capacitación/Constancias", modulo: "formacion" },
  { id: "escalafon", nombre: "Escalafón/Adscripciones/Bolsa de trabajo", modulo: "escalafon" },
  { id: "prestaciones", nombre: "Prestaciones/Crédito/Vivienda", modulo: "prestaciones" },
  { id: "prensa", nombre: "Comunicados/Difusión", modulo: "prensa" },
  { id: "consultorios", nombre: "Consultorios/Convenios", modulo: "consultorios" },
  { id: "deporte-cultura", nombre: "Eventos deportivos/culturales", modulo: "deporte-cultura" },
  { id: "honor-justicia", nombre: "Honor y Justicia", modulo: "honor-justicia" },
  { id: "electoral", nombre: "Electoral", modulo: "electoral" },
  { id: "facilidades", nombre: "Facilidades Administrativas", modulo: "afiliacion" }, // NUEVO
  // { id: "regional", nombre: "Solicitud regional/facilidades", modulo: "regiones" }, // opcional
];

/* ---------- util folio ---------- */
function generarFolio(moduloSlug) {
  const code = MOD_CODES[moduloSlug] || "AFI";
  const y = new Date().getFullYear();
  const n = String(Date.now()).slice(-6);
  return `${code}-${y}-${n}`;
}

/* ---------- validadores ---------- */
const CURP_RE = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/i;
const RFC_RE  = /^([A-ZÑ&]{3,4})(\d{6})([A-Z0-9]{3})$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return j(405, false, "Method Not Allowed");

  // 1) Parseo
  let data = {};
  try { data = JSON.parse(event.body || "{}"); }
  catch { return j(400, false, "Cuerpo inválido"); }

  // 2) Campos
  const {
    nombre = "",
    correo = "",
    telefono = "",
    curp = "",
    rfc = "",
    unidadAdscripcion, // nuevo
    seccion,           // retro-compatibilidad
    tipo = "",
    prioridad = "Media",
    descripcion = "",
    modulo,
    files = [],
    privacyAccepted = false,
    recaptchaToken,

    // Facilidades
    cantidadSolicitantes = "",
    fechasSolicitadas = "",
    tipoEvento = "",
    institucion = "",
  } = data || {};

  if (!privacyAccepted) return j(400, false, "Debes aceptar el aviso de privacidad");
  if (!nombre.trim())  return j(400, false, "Falta nombre");
  if (!EMAIL_RE.test(correo || "")) return j(400, false, "Correo inválido");
  if (!telefono?.trim()) return j(400, false, "Falta teléfono");
  if (!tipo?.trim()) return j(400, false, "Falta tipo de solicitud");
  if (!descripcion?.trim()) return j(400, false, "Falta descripción");

  if (curp && !CURP_RE.test(curp)) return j(400, false, "CURP inválida");
  if (rfc && !RFC_RE.test(rfc)) return j(400, false, "RFC inválido");

  // Requisitos específicos de Facilidades
  if (tipo === "facilidades") {
    const req = { cantidadSolicitantes, fechasSolicitadas, tipoEvento, institucion };
    for (const [k, v] of Object.entries(req)) {
      if (!String(v || "").trim()) return j(400, false, `Falta ${etiquetaCampo(k)} (Facilidades)`);
    }
  }

  // 3) reCAPTCHA
  if (process.env.RECAPTCHA_SECRET) {
    if (!recaptchaToken) return j(400, false, "Completa el reCAPTCHA");
    try {
      const params = new URLSearchParams({ secret: process.env.RECAPTCHA_SECRET, response: recaptchaToken });
      const resp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      const verify = await resp.json();
      if (!verify.success) return j(400, false, "Falló reCAPTCHA");
    } catch {
      return j(400, false, "Error al verificar reCAPTCHA");
    }
  }

  // 4) Mapeo tipo → módulo
  const tipos = Array.isArray(CONFIG.tickets?.tipos) && CONFIG.tickets.tipos.length ? CONFIG.tickets.tipos : DEFAULT_TIPOS;
  const tipoObj = tipos.find(t => t.id === tipo) || null;
  const moduloDestino = modulo || (tipoObj ? tipoObj.modulo : "afiliacion");
  const folio = generarFolio(moduloDestino);
  const submittedAt = new Date().toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });

  // 5) Adjuntos
  let totalSize = 0;
  const safeAttachments = [];
  if (Array.isArray(files)) {
    for (const f of files.slice(0, 4)) {
      if (!f || !f.filename || !f.base64) continue;
      const ct = String(f.contentType || "").toLowerCase();
      const okType = ct.includes("pdf") || ct.includes("jpeg") || ct.includes("jpg") || ct.includes("png");
      if (!okType) continue;
      const buf = Buffer.from(f.base64, "base64");
      totalSize += buf.length;
      if (buf.length > 2 * 1024 * 1024) continue; // >2MB
      const isAcuse = String(f.purpose || "") === "acuseRh";
      const filename = isAcuse ? `acuse-${sanitizeName(f.filename)}` : sanitizeName(f.filename);
      safeAttachments.push({ filename, content: buf, contentType: ct });
    }
  }
  if (totalSize > 5 * 1024 * 1024) {
    return j(400, false, "El total de adjuntos supera 5 MB");
  }

  // 6) SMTP
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  try { await transporter.verify(); }
  catch (e) {
    console.error("SMTP verify failed:", { code: e.code, msg: e.message });
    return j(500, false, "SMTP no disponible (verify failed)");
  }

  // 7) Destinatario
  const envKey = `TICKETS_TO_${(MOD_CODES[moduloDestino] || "AFI")}`;
  const toFromEnvSpecific = process.env[envKey];
  const toFromConfig = CONFIG.emails?.tickets?.[moduloDestino];
  const toFromEnvDefault = process.env.TICKETS_TO_DEFAULT || process.env.TO_ACTAS;
  const to = toFromEnvSpecific || toFromConfig || toFromEnvDefault || "actas@sityps.org.mx";

  const subject = `[Ticket] ${folio} - ${tipoObj ? tipoObj.nombre : tipo} - ${nombre}`;
  const unidad = unidadAdscripcion || seccion || "-";

  // 8) CSV
  const headers = [
    "folio","moduloDestino","tipo","prioridad","nombre","correo","telefono","curp","rfc","unidadAdscripcion",
    "descripcion","fechaHora","cantidadSolicitantes","fechasSolicitadas","tipoEvento","institucion"
  ];
  const row = [
    folio, moduloDestino, (tipoObj ? tipoObj.nombre : tipo), prioridad,
    nombre, correo, telefono, curp, rfc, unidad,
    (descripcion || "").replace(/\r?\n/g, " ").trim(),
    submittedAt,
    tipo === "facilidades" ? (cantidadSolicitantes || "") : "",
    tipo === "facilidades" ? (fechasSolicitadas || "") : "",
    tipo === "facilidades" ? (tipoEvento || "") : "",
    tipo === "facilidades" ? (institucion || "") : "",
  ];
  const csv = `${headers.join(",")}\n${row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")}\n`;

  // 9) Cuerpo de texto
  const cuerpoBase = `Nuevo ticket de asistencia
Folio: ${folio}
Módulo destino: ${moduloDestino.toUpperCase()}
Tipo: ${tipoObj ? tipoObj.nombre : tipo}
Prioridad: ${prioridad}
Fecha/hora: ${submittedAt}

Solicitante:
- Nombre:   ${nombre}
- Correo:   ${correo}
- Teléfono: ${telefono}
- CURP:     ${curp || "-"}
- RFC:      ${rfc || "-"}
- Unidad:   ${unidad}

Descripción:
${descripcion}
`;

  const cuerpoFac = (tipo === "facilidades") ? `
--- Facilidades Administrativas ---
- Cantidad de solicitantes: ${cantidadSolicitantes}
- Fechas solicitadas:       ${fechasSolicitadas}
- Tipo de evento/incidencia:${tipoEvento}
- Institución:              ${institucion}
(Se anexa acuse a RH si fue proporcionado)
` : "";

  const cuerpo = `${cuerpoBase}${cuerpoFac}
--
Mensaje enviado desde sityps.org.mx (Mesa de Asistencia)`;

  // 10) Enviar
  try {
    await transporter.sendMail({
      from: `SITYPS <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: cuerpo,
      attachments: [
        { filename: "ticket.csv", content: csv, contentType: "text/csv" },
        ...safeAttachments,
      ],
    });
    return j(200, true, "Ticket registrado correctamente", { folio });
  } catch (e) {
    console.error("Mailer error:", { code: e.code, msg: e.message });
    return j(500, false, "No se pudo enviar el correo");
  }
};

function etiquetaCampo(k) {
  const map = {
    cantidadSolicitantes: "cantidad de solicitantes",
    fechasSolicitadas: "fechas solicitadas",
    tipoEvento: "tipo de evento/incidencia",
    institucion: "institución",
  };
  return map[k] || k;
}

function sanitizeName(name) {
  return String(name || "")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}
