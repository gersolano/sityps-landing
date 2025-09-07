/* eslint-disable */
const { getStore } = require("@netlify/blobs");
const jwt = require("jsonwebtoken");

/* --- Helpers --- */
function nowISO() { return new Date().toISOString(); }
function mapEstado(e) {
  if (!e) return "nuevo";
  const v = String(e).toLowerCase().replace(" ", "_");
  if (["nuevo","en_proceso","resuelto","cerrado"].includes(v)) return v;
  return "nuevo";
}
function toBackHistory(arr) {
  return Array.isArray(arr) ? arr : [];
}
function normalizeTicketForSave(t) {
  // aseguremos campos principales
  t.folio = t.folio || t.id || `T-${Date.now()}`;
  t.submittedAt = t.submittedAt || t.fechaISO || nowISO();
  t.estado = mapEstado(t.estado || "nuevo");
  t.prioridad = t.prioridad || "Media";
  t.historico = toBackHistory(t.historico || t.historial);
  return t;
}
function mapToBackofficeShape(t) {
  return {
    folio: t.folio,
    submittedAt: t.submittedAt || t.fechaISO || t.fecha || nowISO(),
    moduloDestino: t.moduloDestino || t.modulo || "",
    tipo: t.tipo || "",
    nombre: t.nombre || "",
    correo: t.correo || "",
    telefono: t.telefono || "",
    unidadAdscripcion: t.unidadAdscripcion || t.unidad || "",
    curp: t.curp || "",
    rfc: t.rfc || "",
    descripcion: t.descripcion || "",
    prioridad: t.prioridad || "Media",
    estado: mapEstado(t.estado),
    asignadoA: t.asignadoA || "",
    historico: Array.isArray(t.historico) ? t.historico : [],
    facilidades: t.facilidades
      ? {
          cantidadSolicitantes: t.facilidades.cantidadSolicitantes,
          fechasSolicitadas: t.facilidades.fechasSolicitadas,
          tipoEvento: t.facilidades.tipoEvento,
          institucion: t.facilidades.institucion,
        }
      : undefined,
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

    const opts = process.env.BLOBS_STORE_NAME ? { name: process.env.BLOBS_STORE_NAME } : undefined;
    const store = getStore(opts);

    // cargar ticket
    const key = `tickets/${folio}.json`;
    let ticket = await store.get(key, { type: "json" });

    // fallback por búsqueda
    let realKey = key;
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

    // permisos
    const claims = readClaims(event);
    if (!canEdit(ticket, claims)) {
      return { statusCode: 403, body: JSON.stringify({ ok: false, error: "No autorizado" }) };
    }

    // aplicar cambios
    const hist = Array.isArray(ticket.historico) ? ticket.historico : (ticket.historico = []);
    const by = actorFromClaims(claims);

    if ("estado" in cambios && cambios.estado) {
      const prev = ticket.estado;
      ticket.estado = mapEstado(cambios.estado);
      if (ticket.estado !== prev) {
        hist.push({ at: nowISO(), by, action: "estado", value: ticket.estado });
      }
    }
    if ("prioridad" in cambios && cambios.prioridad) {
      const prev = ticket.prioridad;
      ticket.prioridad = String(cambios.prioridad);
      if (ticket.prioridad !== prev) {
        hist.push({ at: nowISO(), by, action: "prioridad", value: ticket.prioridad });
      }
    }
    if ("asignadoA" in cambios) {
      const prev = ticket.asignadoA || "";
      ticket.asignadoA = String(cambios.asignadoA || "");
      if (ticket.asignadoA !== prev) {
        hist.push({ at: nowISO(), by, action: "asignacion", value: ticket.asignadoA });
      }
    }
    if (cambios.nota) {
      const texto = String(cambios.nota || "").trim();
      if (texto) {
        hist.push({ at: nowISO(), by, action: "nota", notes: texto });
      }
    }

    // guardar
    await store.set(realKey, JSON.stringify(ticket, null, 2), { contentType: "application/json" });

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
