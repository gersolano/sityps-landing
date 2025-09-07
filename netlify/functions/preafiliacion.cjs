/* eslint-disable */
const nodemailer = require("nodemailer");

/* =========================
   Utils
   ========================= */
function isEmail(x) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(x || "").trim()); }
function nowISO() { return new Date().toISOString(); }
function preview(text, n = 240) {
  const s = String(text || "");
  return s.length > n ? s.slice(0, n) + "…" : s;
}
function safe(x) {
  return String(x ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function splitEmails(value) {
  return String(value || "")
    .split(/[;,]/g)
    .map((s) => s.trim())
    .filter(isEmail);
}
function uniq(arr) { return [...new Set((arr || []).filter(Boolean))]; }
function displayName(nombres, ap, am) {
  return [nombres, ap, am].map(s => String(s || "").trim()).filter(Boolean).join(" ");
}

function makeTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("Faltan SMTP_HOST/SMTP_USER/SMTP_PASS");
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465=SSL, 587=STARTTLS
    auth: { user, pass },
  });
}

/* =========================
   Plantilla HTML
   ========================= */
function baseStyles() {
  return `
    .wrap{max-width:640px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb}
    .hdr{background:#7a0c0c;color:#fff;padding:16px 20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial}
    .title{font-size:18px;font-weight:700;margin:0}
    .body{padding:20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial;color:#111827}
    .kv{width:100%;border-collapse:collapse;margin:8px 0 16px}
    .kv th{text-align:left;font-weight:600;color:#374151;padding:6px 0;white-space:nowrap;vertical-align:top;width:220px}
    .kv td{color:#111827;padding:6px 0}
    .muted{color:#6b7280}
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

function htmlPreafiliacionTable(d) {
  return `
    <table class="kv">
      <tr><th>Fecha</th><td>${safe(new Date(d.fechaISO || nowISO()).toLocaleString("es-MX"))}</td></tr>
      <tr><th>Nombre(s)</th><td>${safe(d.nombres || "")}</td></tr>
      <tr><th>Apellido paterno</th><td>${safe(d.apellidoPaterno || "")}</td></tr>
      <tr><th>Apellido materno</th><td>${safe(d.apellidoMaterno || "")}</td></tr>
      <tr><th>CURP</th><td>${safe(d.curp || "")}</td></tr>
      <tr><th>RFC</th><td>${safe(d.rfc || "")}</td></tr>
      <tr><th>Correo</th><td>${safe(d.correo || "")}</td></tr>
      <tr><th>Teléfono</th><td>${safe(d.telefono || "")}</td></tr>
      <tr><th>Unidad de adscripción</th><td>${safe(d.unidad || d.unidadAdscripcion || "")}</td></tr>
      <tr><th>Institución</th><td>${safe(d.empresa || d.institucion || "")}</td></tr>
      <tr><th>Domicilio</th><td>${safe(preview(d.domicilio || "", 300))}</td></tr>
      <tr><th>Municipio</th><td>${safe(d.municipio || "")}</td></tr>
      <tr><th>Estado</th><td>${safe(d.estado || "")}</td></tr>
      <tr><th>Aviso de privacidad</th><td>${d.privacyAccepted ? "Aceptado" : "No aceptado"}</td></tr>
    </table>
  `;
}

function buildHtmlEmail({ title, intro, data, footerNote }) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<style>${baseStyles()}</style></head>
<body>
  <div class="wrap">
    <div class="hdr"><h1 class="title">${safe(title)}</h1></div>
    <div class="body">
      <p>${safe(intro)}</p>
      ${htmlPreafiliacionTable(data)}
      <div class="foot">${safe(footerNote || "Este es un aviso automático del sistema SITYPS.")}</div>
    </div>
  </div>
</body></html>`;
}

/* =========================
   CSV
   ========================= */
function toCSVRow(arr) {
  return arr.map((v) => {
    const s = String(v ?? "");
    if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }).join(",") + "\n";
}
function buildCSV(data) {
  const headers = [
    "fechaISO","nombres","apellidoPaterno","apellidoMaterno",
    "curp","rfc","correo","telefono","unidadAdscripcion",
    "institucion","domicilio","municipio","estado","privacyAccepted"
  ];
  const row = [
    data.fechaISO || nowISO(),
    data.nombres || "",
    data.apellidoPaterno || "",
    data.apellidoMaterno || "",
    data.curp || "",
    data.rfc || "",
    data.correo || "",
    data.telefono || "",
    data.unidad || data.unidadAdscripcion || "",
    data.empresa || data.institucion || "",
    data.domicilio || "",
    data.municipio || "",
    data.estado || "",
    data.privacyAccepted ? "sí" : "no",
  ];
  return toCSVRow(headers) + toCSVRow(row);
}

/* =========================
   reCAPTCHA (opcional)
   ========================= */
async function verifyCaptcha(token, ip) {
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) return { ok: true, detail: "No captcha (sin RECAPTCHA_SECRET)" };
  if (!token) return { ok: false, detail: "Falta token captcha" };
  try {
    const form = new URLSearchParams();
    form.append("secret", secret);
    form.append("response", token);
    if (ip) form.append("remoteip", ip);
    const r = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const j = await r.json();
    return { ok: !!j.success, detail: j };
  } catch (e) {
    // Si falla la verificación por red, no bloqueamos
    return { ok: true, detail: "captcha skipped (network)" };
  }
}

/* =========================
   Handler
   ========================= */
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    // Campos esperados desde el front
    const data = {
      fechaISO: nowISO(),
      nombres: String(body.nombres || "").trim(),
      apellidoPaterno: String(body.apellidoPaterno || "").trim(),
      apellidoMaterno: String(body.apellidoMaterno || "").trim(),
      curp: String(body.curp || "").trim(),
      rfc: String(body.rfc || "").trim(),
      correo: String(body.correo || "").trim(),
      telefono: String(body.telefono || "").trim(),
      unidad: String(body.unidad || body.unidadAdscripcion || "").trim(),
      empresa: String(body.empresa || body.institucion || "").trim(),
      domicilio: String(body.domicilio || "").trim(),
      municipio: String(body.municipio || "").trim(),
      estado: String(body.estado || "").trim(),
      privacyAccepted: !!body.privacyAccepted,
      captchaToken: body.captcha || body["g-recaptcha-response"] || body.recaptchaToken || "",
    };

    // Validaciones mínimas
    if (!data.nombres) return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Faltan nombres" }) };
    if (!isEmail(data.correo)) return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Correo inválido" }) };
    if (!data.privacyAccepted) return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Debes aceptar el aviso de privacidad" }) };

    // Captcha (si está habilitado)
    const ip = event.headers["x-forwarded-for"] || event.headers["client-ip"] || "";
    const cap = await verifyCaptcha(data.captchaToken, ip);
    if (!cap.ok) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Captcha inválido" }) };
    }

    // Recipientes: Actas y Acuerdos + fallback + solicitante
    const recip = [];
    if (process.env.TO_ACTAS) recip.push(...splitEmails(process.env.TO_ACTAS));
    if (process.env.TICKETS_TO_DEFAULT) recip.push(...splitEmails(process.env.TICKETS_TO_DEFAULT));
    if (isEmail(data.correo)) recip.push(data.correo);
    const toList = uniq(recip);
    if (toList.length === 0) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Sin destinatarios (configura TO_ACTAS o TICKETS_TO_DEFAULT)" }) };
    }

    // CSV
    const csv = buildCSV(data);

    // Correo
    let mailOk = false, mailError = "";
    try {
      const transport = makeTransport();
      const pref = process.env.SUBJECT_PREFIX || "SITYPS";
      const nombreFull = displayName(data.nombres, data.apellidoPaterno, data.apellidoMaterno) || data.correo || "Solicitante";
      const subject = `${pref} · Preafiliación — ${nombreFull}`;

      const html = buildHtmlEmail({
        title: "Solicitud de preafiliación",
        intro: "Hemos recibido tu solicitud. El área de Organización, Actas y Acuerdos iniciará el trámite de afiliación.",
        data,
        footerNote: "Si no esperabas este correo, por favor ignóralo.",
      });

      const text =
        `Fecha: ${new Date(data.fechaISO).toLocaleString("es-MX")}\n` +
        `Nombre(s): ${data.nombres}\n` +
        `Apellidos: ${data.apellidoPaterno} ${data.apellidoMaterno}\n` +
        `CURP: ${data.curp}\nRFC: ${data.rfc}\n` +
        `Correo: ${data.correo}\nTeléfono: ${data.telefono}\n` +
        `Unidad: ${data.unidad}\nInstitución: ${data.empresa}\n` +
        `Domicilio: ${preview(data.domicilio)}\nMunicipio/Estado: ${data.municipio}/${data.estado}\n` +
        `Aviso de privacidad: ${data.privacyAccepted ? "Aceptado" : "No aceptado"}\n`;

      await transport.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: toList.join(", "),
        subject,
        text,
        html,
        attachments: [
          {
            filename: "preafiliacion.csv",
            content: Buffer.from(csv, "utf8"),
            contentType: "text/csv",
          },
        ],
      });
      mailOk = true;
    } catch (e) {
      mailError = String(e.message || e);
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, mailOk, ...(mailOk ? {} : { mailError }) }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: String(err.message || err) }),
    };
  }
};
