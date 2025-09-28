// netlify/functions/tickets-notify.cjs
const nodemailer = require('nodemailer');
const { getTicketStore } = require('./_store.cjs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { folio, to, cc, subject, html, text } = JSON.parse(event.body || '{}');
    if (!folio || !to) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Faltan datos (folio/to)' }) };
    }

    const store = await getTicketStore();
    const doc = await store.getJSON(`tickets/${folio}.json`);
    if (!doc) return { statusCode: 404, body: JSON.stringify({ ok: false, error: 'No encontrado' }) };

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const prefix = process.env.SUBJECT_PREFIX || '[SITYPS]';
    const asunto = `${prefix} ${subject || 'Ticket'} ${doc.folio}`;

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      cc,
      subject: asunto,
      text:
        text ||
        `Folio: ${doc.folio}\nEstado: ${doc.estado}\nSolicitante: ${doc.solicitante?.nombre}\nMódulo: ${doc.modulo}\nTipo: ${doc.tipo}\n`,
      html:
        html ||
        `<p><strong>Folio:</strong> ${doc.folio}</p>
         <p><strong>Estado:</strong> ${doc.estado}</p>
         <p><strong>Solicitante:</strong> ${doc.solicitante?.nombre} &lt;${doc.solicitante?.correo}&gt;</p>
         <p><strong>Módulo:</strong> ${doc.modulo}</p>
         <p><strong>Tipo:</strong> ${doc.tipo}</p>`,
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};
