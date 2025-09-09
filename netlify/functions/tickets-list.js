// netlify/functions/tickets-list.js
// Devuelve la lista de tickets desde Netlify Blobs usando prefijo "tickets/".

const { getTicketStore } = require("./_store.cjs");

/** Normaliza string */
const s = (v) => (v ?? "").toString().trim();
const toISO = (d) => (d ? new Date(d).toISOString() : null);

exports.handler = async (event) => {
  try {
    const store = await getTicketStore();

    // Parámetros de filtro/paginación
    const url = new URL(event.rawUrl || `http://x${event.path}?${event.queryStringParameters ?? ""}`);
    const q = s(url.searchParams.get("q")).toLowerCase();         // texto libre
    const estado = s(url.searchParams.get("estado")).toLowerCase();
    const modulo = s(url.searchParams.get("modulo")).toLowerCase();
    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt(url.searchParams.get("pageSize") || "25", 10), 1),
      200
    );

    // 1) Listamos claves bajo tickets/
    const entries = await store.list("tickets/");
    // Filtramos solo JSON de tickets (evita adjuntos)
    const ticketKeys = entries
      .map((e) => e.key)
      .filter((k) => /^tickets\/T-[^/]+\.json$/i.test(k));

    // 2) Cargamos cada ticket
    const all = [];
    for (const key of ticketKeys) {
      const row = await store.getJSON(key);
      if (!row) continue;
      // Campos tolerantes (por si vienen con nombres distintos)
      const folio = row.folio || row.id || key.replace(/^tickets\//, "").replace(/\.json$/i, "");
      const createdAt = row.createdAt || row.fecha || row.fechaISO || row.fechaCreacion;
      const moduloRow = row.modulo || row.secretaria || "";
      const tipo = row.tipo || row.clase || "";
      const solicitante =
        row.solicitante ||
        { nombre: row.nombre || row.solicitanteNombre || "", correo: row.correo || "" };
      const prioridad = row.prioridad || "Normal";
      const estadoRow = (row.estado || "nuevo").toLowerCase();
      const ultimoCorreo = row.lastMailAt || row.ultimoCorreo || null;

      all.push({
        folio,
        createdAt: toISO(createdAt) || toISO(row.timestamp) || toISO(Date.now()),
        modulo: moduloRow,
        tipo,
        solicitante,
        prioridad,
        estado: estadoRow,
        ultimoCorreo,
        _raw: row,
      });
    }

    // 3) Filtros
    let filtered = all;
    if (q) {
      filtered = filtered.filter((t) => {
        const hay =
          t.folio.toLowerCase().includes(q) ||
          s(t.modulo).toLowerCase().includes(q) ||
          s(t.tipo).toLowerCase().includes(q) ||
          s(t.solicitante?.nombre).toLowerCase().includes(q) ||
          s(t.solicitante?.correo).toLowerCase().includes(q);
        return hay;
      });
    }
    if (estado) {
      filtered = filtered.filter((t) => t.estado === estado);
    }
    if (modulo) {
      filtered = filtered.filter((t) => s(t.modulo).toLowerCase() === modulo);
    }

    // 4) Orden por fecha (desc)
    filtered.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    // 5) Paginación
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const rows = filtered.slice(start, start + pageSize);

    return {
      statusCode: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        ok: true,
        total,
        page,
        pageSize,
        rows: rows.map((t) => ({
          folio: t.folio,
          fecha: t.createdAt,
          modulo: t.modulo,
          tipo: t.tipo,
          solicitante: t.solicitante,
          prioridad: t.prioridad,
          estado: t.estado,
          ultimoCorreo: t.ultimoCorreo,
        })),
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ ok: false, error: String(err?.message || err) }),
    };
  }
};
