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

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const to = process.env.TO_ACTAS || "actas@sityps.org.mx";
  const subject = `${process.env.SUBJECT_PREFIX || "Preafiliación"} - ${data.apellidoPaterno} ${data.apellidoMaterno}, ${data.nombres}`;

  const cuerpo = `Nueva solicitud de preafiliación:

${JSON.stringify(data, null, 2)}

--
Este mensaje fue enviado desde sityps.org.mx`;

  // CSV (una fila) para importar a Access
  const headers = Object.keys(data);
  const csvLine = headers.map((k) => `"${String(data[k] ?? "").replace(/"/g,'""')}"`).join(",");
  const csv = `${headers.join(",")}\n${csvLine}\n`;

  try {
    await transporter.sendMail({
      from: `SITYPS <${process.env.SMTP_USER}>`,
      to,
      cc: process.env.CC || undefined,
      subject,
      text: cuerpo,
      attachments: [{ filename: "preafiliacion.csv", content: csv, contentType: "text/csv" }],
    });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error("Mailer error:", e);
    return { statusCode: 500, body: "No se pudo enviar el correo" };
  }
};
