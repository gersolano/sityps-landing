/* eslint-disable */
const { getStore } = require("@netlify/blobs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

/* =========================
   Utils
   ========================= */
function nowISO() { return new Date().toISOString(); }
function mapEstado(e) {
  if (!e) return "nuevo";
  const v = String(e).toLowerCase().replace(/\s+/g, "_");
  return ["nuevo", "en_proceso", "resuelto", "cerrado"].includes(v) ? v : "nuevo";
}
function isEmail(x) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(x || "").trim()); }
function uniq(arr) { return [...new Set((arr || []).filter(Boolean))]; }
function splitEmails(value) {
  return String(value || "")
    .split(/[;,]/g)
    .map((s) => s.trim())
    .filter(isEmail);
}
function preview(text, n = 240) {
  const s = String(text || "");
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/* Normaliza y mapea ticket */
function normalizeTicketForSave(t) {
  t.folio = t.folio || t.id || `T-${Date.now()}`;
  t.submittedAt = t.submittedAt || t.fechaISO || nowISO();
  t.estado = mapEstado(t.estado || "nuevo");
  t.prioridad = t.prioridad || "Media";
  t.historico = Array.isArray(t.historico)
    ? t.historico
    : Array.isArray(t.historial)
    ? t.historial.map((h) => ({
        at: h.ts || h.at || nowISO(),
        by: h.por || h.by || "sistema",
        action: h.tipo || h.action || "evento",
        value: h.valor,
        notes: h.texto || h.notes,
      }))
    : [];
  return t;
}
function mapToBackofficeShape(t) {
  const facil = t.facilidades
    ? {
        cantidadSolicitantes:
          t.facilidades.cantidadSolicitantes ??
          t.facilidades.cantidad ??
          t.facilidades.solicitantes ??
          1,
        fechasSolicitadas: (() => {
          const f = t.facilidades;
          if (f.diasSolicitados === 1 && f.fecha) return f.fecha;
          if (f.periodo?.desde && f.periodo?.hasta) return `${f.periodo.desde} a ${f.periodo.hasta}`;
          return f.fechasSolicitadas || "";
        })(),
        tipoEvento: t.facilidades.tipoEvento || t.facilidades.evento || "",
        institucion: t.facilidades.institucion || "",
      }
    : undefined;

  return {
    folio: t.folio,
    submittedAt: t.submittedAt || t.fechaISO || t.fecha || nowISO(),
    moduloDestino: t.moduloDestino || t.modulo || t.secretaria || "",
    tipo: t.tipo || t.tipoSolicitud || "",
    nombre: t.nombre || t.contacto?.nombre || "",
    correo: t.correo || t.contacto?.correo || "",
    telefono: t.telefono || t.contacto?.telefono || "",
    unidadAdscripcion: t.unidadAdscripcion || t.unidad || t.adscripcion || "",
    curp: t.curp || "",
    rfc: t.rfc || "",
    descripcion: t.descripcion || "",
    prioridad: t.prioridad || "Media",
    estado: mapEstado(t.estado),
    asignadoA: t.asignadoA || "",
    historico: Array.isArray(t.historico) ? t.historico : [],
    facilidades: facil,
    adjuntos: Array.isArray(t.adjuntos) ? t.adjuntos : [],
  };
}

/* Auth (opcional) */
function readClaims(event) {
  try {
    const auth = event.headers?.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token || !process.env.JWT_SECRET) return {};
    return jwt.verify(token, process.env.JWT_SECRET) || {};
  } catch {
    return {};
  }
}
function actorFromClaims(claims) {
  return claims.name || claims.nombre || claims.email || claims.user || "backoffice";
}
function canEdit(ticket, claims) {
  const role = String((claims.role || claims.rol || "")).toLowerCase();
  if (role === "admin" || role === "soporte") return true;
  const moduloUsuario = (claims.dept || claims.modulo || claims.puesto || "").toLowerCase();
  const modTicket = (ticket.moduloDestino || ticket.modulo || "").toLowerCase();
  return moduloUsuario && modTicket.includes(moduloUsuario);
}

/* =========================
   Correo
   ========================= */
function makeTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("Faltan SMTP_HOST/SMTP_USER/SMTP_PASS");
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = SSL, 587 = STARTTLS
    auth: { user, pass },
  });
}

/* (Opcional futuro) ruteo por módulo si defines envs por módulo */
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

/* Destinatarios (mismo criterio que en create + asignadoA si es email) */
function computeRecipientsOnUpdate(ticket, cambios) {
  const dest = [];

  // Fallback global (hoy es la vía principal)
  if (process.env.TICKETS_TO_DEFAULT) {
    dest.push(...splitEmails(process.env.TICKETS_TO_DEFAULT));
  }

  // Copia al solicitante
  if (isEmail(ticket.correo)) {
    dest.push(ticket.correo);
  }

  // (Opcional) ruteo por módulo si defines ENV
  const modulo = (ticket.moduloDestino || ticket.modulo || "").toLowerCase();
  for (const rule of MOD_TO_ENV) {
    if (rule.match.test(modulo)) {
      const envVal = process.env[rule.env];
      if (envVal) dest.push(...splitEmails(envVal));
      break;
    }
  }

  // (Opcional) asignadoA si es correo
  const asignado = cambios?.asignadoA || ticket.asignadoA;
  if (isEmail(asignado)) dest.push(asignado);

  return uniq(dest);
}

/* Cuerpo con el mismo estilo que tickets-create */
function buildMailOnUpdate(ticketAfter, cambiosAplicados) {
  const pref = process.env.SUBJECT_PREFIX || "SITYPS";
  const subject = `[${pref}] Ticket ${ticketAfter.folio} actualizado`;

  const l1 = `Folio: ${ticketAfter.folio}\n`;
  const l2 = `Fecha: ${new Date(ticketAfter.submittedAt).toLocaleString("es-MX")}\n`;
  const l3 = `Módulo: ${ticketAfter.moduloDestino || ticketAfter.modulo || "—"}\n`;
  const l4 = `Tipo: ${ticketAfter.tipo || "—"}\n`;
  const l5 = `Solicitante: ${ticketAfter.nombre || "—"} (${ticketAfter.correo || "—"})\n`;
  const l6 = `Teléfono: ${ticketAfter.telefono || "—"} | Unidad: ${ticketAfter.unidadAdscripcion || "—"}\n`;
  const l7 = `Descripción: ${preview(ticketAfter.descripcion || "—")}\n`;

  let facil = "";
  if (ticketAfter.facilidades) {
    const f = ticketAfter.facilidades;
    facil =
      `\n[Facilidades administrativas]\n` +
      `Institución: ${f.institucion || "—"}\n` +
      `Evento/Incidencia: ${f.tipoEvento || "—"}\n` +
      `Solicitantes: ${f.cantidadSolicitantes || 1}\n` +
      `Fechas solicitadas: ${f.fechasSolicitadas || "—"}\n`;
  }

  const cambiosTxt = Object.entries(cambiosAplicados)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n") || "—";

  const text =
    `${l1}${l2}${l3}${l4}${l5}${l6}\n${l7}${facil}\n` +
    `---\nCambios aplicados:\n${cambiosTxt}\n` +
    `---\nBackoffice: buscar por folio ${ticketAfter.folio}\n`;

  return { subject, text };
}

/* =========================
   Handler
   ========================= */
exports.handler = async (event) => {
  if (event.httpMethod !== "POST" && event.httpMethod !== "PATCH") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const folio = body.folio || "";
    const cambios = body.cambios || {};
    if (!folio) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Falta el folio" }) };
    }
    if (!cambios || typeof cambios !== "object") {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Faltan cambios" }) };
    }

    // Blobs
    const opts = process.env.BLOBS_STORE_NAME ? { name: process.env.BLOBS_STORE_NAME } : undefined;
    const store = getStore(opts);

    // Cargar ticket
    const keyDirect = `tickets/${folio}.json`;
    let ticket = await store.get(keyDirect, { type: "json" });
    let realKey = keyDirect;

    // Fallback: buscar por listado si no encontramos el key directo
    if (!ticket) {
      let cursor;
      do {
        const page = await store.list({ prefix: "tickets/", cursor });
        for (const b of page.blobs || []) {
          if (!b.key.endsWith(".json")) continue;
          const t = await store.get(b.key, { type: "json" });
          if (t?.folio === folio) {
            ticket = t;
            realKey = b.key;
            break;
          }
        }
        cursor = page.cursor;
      } while (!ticket && cursor);
      if (!ticket) {
        return { statusCode: 404, body: JSON.stringify({ ok: false, error: "Ticket no encontrado" }) };
      }
    }

    ticket = normalizeTicketForSave(ticket);

    // Permisos
    const claims = readClaims(event);
    if (!canEdit(ticket, claims)) {
      return { statusCode: 403, body: JSON.stringify({ ok: false, error: "No autorizado" }) };
    }

    // Aplicar cambios + histórico
    const hist = Array.isArray(ticket.historico) ? ticket.historico : (ticket.historico = []);
    const by = actorFromClaims(claims);

    const cambiosAplicados = {};
    if ("estado" in cambios && cambios.estado) {
      const prev = ticket.estado;
      ticket.estado = mapEstado(cambios.estado);
      if (ticket.estado !== prev) {
        hist.push({ at: nowISO(), by, action: "estado", value: ticket.estado });
        cambiosAplicados.estado = `${prev} → ${ticket.estado}`;
      }
    }
    if ("prioridad" in cambios && cambios.prioridad) {
      const prev = ticket.prioridad;
      ticket.prioridad = String(cambios.prioridad);
      if (ticket.prioridad !== prev) {
        hist.push({ at: nowISO(), by, action: "prioridad", value: ticket.prioridad });
        cambiosAplicados.prioridad = `${prev} → ${ticket.prioridad}`;
      }
    }
    if ("asignadoA" in cambios) {
      const prev = ticket.asignadoA || "—";
      ticket.asignadoA = String(cambios.asignadoA || "");
      if (ticket.asignadoA !== prev) {
        hist.push({ at: nowISO(), by, action: "asignacion", value: ticket.asignadoA });
        cambiosAplicados.asignacion = `${prev} → ${ticket.asignadoA || "—"}`;
      }
    }
    if (cambios.nota) {
      const texto = String(cambios.nota || "").trim();
      if (texto) {
        hist.push({ at: nowISO(), by, action: "nota", notes: texto });
        cambiosAplicados.nota = preview(texto, 120);
      }
    }

    // Guardar
    await store.set(realKey, JSON.stringify(ticket, null, 2), { contentType: "application/json" });

    // Enviar correo (no bloqueante)
    let mailOk = false, mailError = "";
    try {
      if (Object.keys(cambiosAplicados).length > 0) {
        const toList = computeRecipientsOnUpdate(ticket, cambios);
        if (toList.length > 0) {
          const { subject, text } = buildMailOnUpdate(ticket, cambiosAplicados);
          const transport = makeTransport();
          await transport.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: toList.join(", "),
            subject,
            text,
          });
          mailOk = true;
        } else {
          mailError = "Sin destinatarios (revisa TICKETS_TO_DEFAULT o correos por módulo)";
        }
      }
    } catch (e) {
      mailError = String(e.message || e);
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: true,
        ticket: mapToBackofficeShape(ticket),
        mailOk,
        ...(mailOk ? {} : { mailError }),
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: String(err.message || err) }),
    };
  }
};
