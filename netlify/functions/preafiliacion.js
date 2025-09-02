// netlify/functions/preafiliacion.js
const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let data = {};
  try {
    const ctype = event.headers["content-type"] || "";
    if (ctype.includes("application/json")) {
      data = JSON.parse(event.body || "{}");
    } else if (ctype.includes("application/x-www-form-urlencoded")) {
      data = Object.fromEntries(new URLSearchParams(event.body));
    } else {
      data = JSON.parse(event.body || "{}");
    }
  } catch {
    return { statusCode: 400, body: "Cuerpo inválido" };
  }

  const required = [
    "nombres","apellidoPaterno","apellidoMaterno",
    "curp","rfc","telefono","correo",
    "seccion","empresa","domicilio","municipio","estado"
  ];
  for (const k of required) {
    if (!data[k]) return { statusCode: 400, body: `Falta ${k}` };
  }
  if (!data.privacyAccepted || String(data.privacyAccepted).toLowerCase() === "false") {
    return { statusCode: 400, body: "Debes aceptar el aviso de privacidad" };
  }

  const CURP = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/i;
  const RFC  = /^([A-ZÑ&]{3,4})(\d{6})([A-Z0-9]{3})$/i;
  if (!CURP.test(data.curp)) return { statusCode: 400, body: "CURP inválida" };
  if (!RFC.test(data.rfc))   return { statusCode: 400, body: "RFC inválido" };

      // SMTP (usa solo variables de entorno para secretos)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465, // true si 465
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  // Diagnóstico previo: verifica credenciales/conexión
  try {
    await transporter.verify();
  } catch (e) {
    console.error("SMTP verify failed:", {
      code: e.code, responseCode: e.responseCode, command: e.command, message: e.message
    });
    return { statusCode: 500, body: "SMTP no disponible (verify failed)" };
  }

  const to = process.env.TO_ACTAS || CONFIG.emails?.toActas || "actas@sityps.org.mx";
  const subjectPrefix = process.env.SUBJECT_PREFIX || CONFIG.site?.subjectPrefix || "Preafiliación";
  const subject = `${subjectPrefix} - ${data.apellidoPaterno} ${data.apellidoMaterno}, ${data.nombres}`;

  // …cuerpo + CSV igual que antes…

  try {
    await transporter.sendMail({
      from: `SITYPS <${process.env.SMTP_USER}>`,
      to,
      cc: process.env.CC || CONFIG.emails?.cc || undefined,
      subject,
      text: cuerpo,
      attachments: [{ filename: "preafiliacion.csv", content: csv, contentType: "text/csv" }],
    });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error("Mailer error:", {
      code: e.code, responseCode: e.responseCode, command: e.command, message: e.message
    });
    return { statusCode: 500, body: "No se pudo enviar el correo" };
  }

