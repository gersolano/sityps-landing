// netlify/functions/preafiliacion.cjs
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

/* ---------- utilidades de respuesta ---------- */
function json(code, obj) {
  return {
    statusCode: code,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(obj),
  };
}
function text(code, message) {
  return {
    statusCode: code,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: message,
  };
}

/* ---------- configuración opcional local ---------- */
let CONFIG = {};
try {
  const cfgPath = path.join(__dirname, "..", "..", "sityps.config.json");
  CONFIG = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
} catch {
  CONFIG = {};
}

/* ---------- campos permitidos / orden CSV ---------- */
const ALLOWED_FIELDS = [
  "nombres", "apellidoPaterno", "apellidoMaterno",
  "curp", "rfc", "nss",
  "telefono", "correo",
  "seccion", "empresa",
  "domicilio", "municipio", "estado",
  "observaciones",
];

/* =================== HANDLER =================== */
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return text(405, "Method Not Allowed");
  }

  // 1) Parseo body
  let data = {};
  try {
    const ctype = (event.headers["content-type"] || "").toLowerCase();
    if (ctype.includes("application/json")) {
      data = JSON.parse(event.body || "{}");
    } else if (ctype.includes("application/x-www-form-urlencoded")) {
      data = Object.fromEntries(new URLSearchParams(event.body));
    } else {
      data = JSON.parse(event.body || "{}");
    }
  } catch {
    return text(400, "Cuerpo inválido");
  }

  // 2) Validaciones mínimas
  const required = [
    "nombres","apellidoPaterno","apellidoMaterno",
    "curp","rfc","telefono","correo",
    "seccion","empresa","domicilio","municipio","estado",
  ];
  for (const k of required) {
    if (!data[k]) return text(400, `Falta ${k}`);
  }
  if (!data.privacyAccepted || String(data.privacyAccepted).toLowerCase() === "false") {
    return text(400, "Debes aceptar el aviso de privacidad");
  }

  // 3) Validaciones simples MX
  const CURP = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/i;
  const RFC  = /^([A-ZÑ&]{3,4})(\d{6})([A-Z0-9]{3})$/i;
  if (!CURP.test(data.curp)) return text(400, "CURP inválida");
  if (!RFC.test(data.rfc))   return text(400, "RFC inválido");

  // 4) Verificar reCAPTCHA v2 si hay SECRET
  if (process.env.RECAPTCHA_SECRET) {
    const token = data.recaptchaToken || data["g-recaptcha-response"];
    if (!token) return text(400, "Completa el reCAPTCHA");
    try {
      const params = new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET,
        response: token,
      });
      const resp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      const verify = await resp.json();
      if (!verify.success) return text(400, "Falló reCAPTCHA");
    } catch {
      return text(400, "Error al verificar reCAPTCHA");
    }
  }

  // 5) Sanitizar (no enviar campos internos)
  delete data.recaptchaToken;
  delete data["g-recaptcha-response"];
  delete data.privacyAccepted;

  const cleaned = {};
  for (const k of ALLOWED_FIELDS) {
    if (data[k] !== undefined) cleaned[k] = data[k];
  }

  // 6) SMTP
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  try {
    await transporter.verify();
  } catch (e) {
    console.error("SMTP verify failed:", {
      code: e.code, responseCode: e.responseCode, command: e.command, message: e.message,
    });
    return text(500, "SMTP no disponible (verify failed)");
  }

  const to = process.env.TO_ACTAS || CONFIG.emails?.toActas || "actas@sityps.org.mx";
  const subjectPrefix = process.env.SUBJECT_PREFIX || CONFIG.site?.subjectPrefix || "Preafiliación";
  const subject = `${subjectPrefix} - ${data.apellidoPaterno} ${data.apellidoMaterno}, ${data.nombres}`;

  const submittedAt = new Date().toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
  const cuerpo = `Nueva solicitud de preafiliación
Fecha/hora: ${submittedAt}

${JSON.stringify(cleaned, null, 2)}

--
Este mensaje fue enviado desde sityps.org.mx`;

  // 7) CSV
  const headersOrder = Array.isArray(CONFIG.csv?.order) && CONFIG.csv.order.length
    ? CONFIG.csv.order.filter((k) => ALLOWED_FIELDS.includes(k))
    : ALLOWED_FIELDS;

  const headers = headersOrder.filter((k) => Object.prototype.hasOwnProperty.call(cleaned, k));
  const csvLine = headers.map((k) => `"${String(cleaned[k] ?? "").replace(/"/g, '""')}"`).join(",");
  const csv = `${headers.join(",")}\n${csvLine}\n`;

  // 8) Enviar correo
  try {
    await transporter.sendMail({
      from: `SITYPS <${process.env.SMTP_USER}>`,
      to,
      cc: process.env.CC || CONFIG.emails?.cc || undefined,
      subject,
      text: cuerpo,
      attachments: [{ filename: "preafiliacion.csv", content: csv, contentType: "text/csv" }],
    });
    return json(200, { ok: true });
  } catch (e) {
    console.error("Mailer error:", {
      code: e.code, responseCode: e.responseCode, command: e.command, message: e.message,
    });
    return text(500, "No se pudo enviar el correo");
  }
};
