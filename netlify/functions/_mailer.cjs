'use strict';

const nodemailer = require('nodemailer');

function mailEnabled() { return String(process.env.MAIL_ENABLED || '0') === '1'; }

let transporterPromise = null;
async function getTransporter() {
  if (!mailEnabled()) throw new Error('MAIL_DISABLED');
  if (!transporterPromise) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
    const user = process.env.SMTP_USER || undefined;
    const pass = process.env.SMTP_PASS || undefined;
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({ host, port, secure, auth: user ? { user, pass } : undefined })
    );
  }
  return transporterPromise;
}

async function sendMail({ to, subject, html, text, replyTo, attachments }) {
  if (!mailEnabled()) return { skipped: true, reason: 'MAIL_DISABLED' };
  const from = process.env.MAIL_FROM || 'no-reply@sityps.org.mx';
  const tr = await getTransporter();
  await tr.sendMail({ from, to, subject, html, text, replyTo, attachments });
  return { sent: true };
}

function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));}

function renderCreateHTML(t) {
  return `
  <h2>Nuevo ticket ${esc(t.folio)}</h2>
  <p><b>Fecha:</b> ${esc(t.createdAt||'')}</p>
  <p><b>Módulo:</b> ${esc(t.modulo||'')} &nbsp; <b>Tipo:</b> ${esc(t.tipo||'')}</p>
  <p><b>Solicitante:</b> ${esc(t.nombre||'')} &nbsp; <b>Tel:</b> ${esc(t.telefono||'')} &nbsp; <b>Correo:</b> ${esc(t.correo||'')}</p>
  <p><b>Prioridad:</b> ${esc(t.prioridad||'')} &nbsp; <b>Estado:</b> ${esc(t.estado||'')}</p>
  <p><b>Descripción:</b><br>${esc(t.descripcion||'').replace(/\n/g,'<br>')}</p>
  `;
}
function renderUpdateHTML(t, changes={}) {
  return `
  <h2>Actualización ticket ${esc(t.folio)}</h2>
  <p><b>Fecha:</b> ${new Date().toISOString()}</p>
  <p><b>Cambios:</b> ${esc(JSON.stringify(changes))}</p>
  <p><b>Estado:</b> ${esc(t.estado||'')} &nbsp; <b>Prioridad:</b> ${esc(t.prioridad||'')}</p>
  `;
}

module.exports = { mailEnabled, sendMail, renderCreateHTML, renderUpdateHTML };
