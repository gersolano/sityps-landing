/* eslint-disable */
const { getStore } = require("@netlify/blobs");
const jwt = require("jsonwebtoken");

/* --- Helpers --- */
function mapEstado(e) {
  if (!e) return "nuevo";
  const v = String(e).toLowerCase().replace(" ", "_");
  if (["nuevo","en_proceso","resuelto","cerrado"].includes(v)) return v;
  return "nuevo";
}
function fechasSolicitadasFrom(f) {
  if (!f) return "";
  if (f.diasSolicitados === 1 && f.fecha) return f.fecha;
  if (f.periodo && f.periodo.desde && f.periodo.hasta) {
    return `${f.periodo.desde} a ${f.periodo.hasta}`;
  }
  return f.fechasSolicitadas || "";
}
function mapToBackofficeShape(t) {
  // Compatibilidad con varias “versiones” de schema
  const facil = t.facilidades
    ? {
        cantidadSolicitantes:
          t.facilidades.cantidadSolicitantes ??
          t.facilidades.cantidad ??
          t.facilidades.solicitantes ??
          1,
        fechasSolicitadas: fechasSolicitadasFrom(t.facilidades),
        tipoEvento: t.facilidades.tipoEvento || t.facilidades.evento || "",
        institucion: t.facilidades.institucion || "",
      }
    : undefined;

  return {
    folio: t.folio || t.id || "",
    submittedAt: t.submittedAt || t.fechaISO || t.fecha || new Date().toISOString(),
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
    historico: Array.isArray(t.historico)
      ? t.historico
      : Array.isArray(t.historial)
      ? t.historial.map((h) => ({
          at: h.ts || h.at || new Date().toISOString(),
          by: h.por || h.by || "sistema",
          action: h.tipo || h.action || "evento",
          value: h.valor,
          notes: h.texto || h.notes,
        }))
      : [],
    facilidades: facil,
    adjuntos: Array.isArray(t.adjuntos) ? t.adjuntos : [],
  };
}

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

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    const folio = event.queryStringParameters?.folio || "";
    if (!folio) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Falta el folio" }) };
    }

    const opts = process.env.BLOBS_STORE_NAME ? { name: process.env.BLOBS_STORE_NAME } : undefined;
    const store = getStore(opts);

    // 1) Búsqueda directa
    const key = `tickets/${folio}.json`;
    let ticket = await store.get(key, { type: "json" });

    // 2) Fallback por contenido
    if (!ticket) {
      let cursor, found;
      do {
        const page = await store.list({ prefix: "tickets/", cursor });
        for (const b of page.blobs || []) {
          if (!b.key.endsWith(".json")) continue;
          const t = await store.get(b.key, { type: "json" });
          if (t?.folio === folio) {
            ticket = t;
            found = b.key;
            break;
          }
        }
        cursor = page.cursor;
      } while (!ticket && cursor);
      if (!ticket) {
        return { statusCode: 404, body: JSON.stringify({ ok: false, error: "Ticket no encontrado" }) };
      }
    }

    // (opcional) Autorización soft: soporte/admin todo; resto por módulo
    const claims = readClaims(event);
    const role = String((claims.role || claims.rol || "")).toLowerCase();
    if (role && role !== "admin" && role !== "soporte") {
      const moduloUsuario = (claims.dept || claims.modulo || claims.puesto || "").toLowerCase();
      const modTicket = (ticket.moduloDestino || ticket.modulo || "").toLowerCase();
      if (moduloUsuario && !modTicket.includes(moduloUsuario)) {
        return { statusCode: 403, body: JSON.stringify({ ok: false, error: "No autorizado" }) };
      }
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, ticket: mapToBackofficeShape(ticket) }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: String(err.message || err) }),
    };
  }
};
