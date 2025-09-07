import React, { useEffect, useMemo, useRef, useState } from "react";

/* ============================================================
   Utilidades
   ============================================================ */
const API = {
  LIST: "/.netlify/functions/tickets-list",
  UPDATE: "/.netlify/functions/tickets-update",
  AUTH: "/.netlify/functions/auth",
};

// Dominio por defecto para completar usuarios cortos (sin @)
const DEFAULT_LOGIN_DOMAIN = "sityps.org.mx";

const ESTADOS = [
  ["nuevo", "Nuevo"],
  ["en_proceso", "En proceso"],
  ["en_espera", "En espera"],
  ["resuelto", "Resuelto"],
  ["cerrado", "Cerrado"],
];

const PRIORIDADES = [
  ["Baja", "Baja"],
  ["Media", "Media"],
  ["Alta", "Alta"],
  ["Urgente", "Urgente"],
];

const MODULOS = [
  "Secretaría General",
  "Secretaria de Organización, actas y acuerdos",
  "Secretaria de Asuntos Laborales",
  "Secretaría de Formación, Capacitación y Desarrollo Profesional",
  "Secretaría de Seguridad y Previsión Social",
  "Secretaría de Escalafón y Promoción de Plazas",
  "Secretaría de Créditos, vivienda y prestaciones económicas",
  "Secretaría de Relaciones Prensa y propaganda",
  "Secretaría de Finanzas",
  "Secretaría de Fomento Cultural y Deportivo",
  "Secretaría de la Mujer y Equidad de Género",
  "Comisión de Honor y Justicia",
  "Comité Electoral",
  "Comisión Juridica",
];

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return iso;
  return d.toLocaleString();
};

const pillEstado = (estado) => {
  const map = {
    nuevo: "bg-rose-100 text-rose-700",
    en_proceso: "bg-amber-100 text-amber-700",
    en_espera: "bg-gray-200 text-gray-700",
    resuelto: "bg-emerald-100 text-emerald-700",
    cerrado: "bg-slate-200 text-slate-700",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[estado] || "bg-slate-100 text-slate-700"}`}>
      {(ESTADOS.find(([k]) => k === estado)?.[1]) || estado}
    </span>
  );
};

const pillPrioridad = (p) => {
  const map = {
    Baja: "bg-slate-100 text-slate-700",
    Media: "bg-sky-100 text-sky-700",
    Alta: "bg-orange-100 text-orange-700",
    Urgente: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[p] || "bg-slate-100 text-slate-700"}`}>
      {p || "—"}
    </span>
  );
};

const decodeJWT = (token) => {
  try {
    const [, payload] = token.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
};

const fetchJSON = async (url, opts = {}, token) => {
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Normaliza el login: si no trae arroba, completa con el dominio por defecto */
const normalizeLoginEmail = (raw) => {
  const s = (raw || "").trim().toLowerCase();
  if (!s) return "";
  if (s.includes("@")) return s;
  return `${s}@${DEFAULT_LOGIN_DOMAIN}`;
};

/* ============================================================
   Componente principal
   ============================================================ */
export default function Backoffice() {
  const [token, setToken] = useState(() => localStorage.getItem("sityps_jwt") || "");
  const user = useMemo(() => (token ? decodeJWT(token) : null), [token]);

  // filtros
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("todos");
  const [modulo, setModulo] = useState("todos");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  // datos
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // UI
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [openView, setOpenView] = useState(null); // ticket completo en modal
  const [savingCell, setSavingCell] = useState(""); // folio guardando estado

  // login form
  const [loginMail, setLoginMail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [busyLogin, setBusyLogin] = useState(false);

  // Debounce de búsqueda
  const qRef = useRef("");
  useEffect(() => {
    const id = setTimeout(() => {
      if (qRef.current !== q) {
        qRef.current = q;
        setPage(1);
        void load();
      }
    }, 380);
    return () => clearTimeout(id);
    // eslint-disable-next-line
  }, [q]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line
  }, [estado, modulo, pageSize, page, token]);

  async function load() {
    if (!token) return; // espera login
    try {
      setLoading(true);
      setError("");
      const url = new URL(API.LIST, window.location.origin);
      if (q) url.searchParams.set("q", q);
      if (estado !== "todos") url.searchParams.set("estado", estado);
      if (modulo !== "todos") url.searchParams.set("modulo", modulo);
      url.searchParams.set("pageSize", String(pageSize));
      url.searchParams.set("page", String(page));

      const data = await fetchJSON(url.toString(), {}, token);
      if (!data.ok) throw new Error(data.error || "No se pudieron obtener tickets");
      setRows(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total || 0));
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function doLogin(e) {
    e.preventDefault();
    setBusyLogin(true);
    setError("");
    try {
      const email = normalizeLoginEmail(loginMail);
      const resp = await fetchJSON(API.AUTH, {
        method: "POST",
        body: JSON.stringify({ email, password: loginPass }),
      });
      if (!resp.ok || !resp.token) throw new Error(resp.error || "Credenciales inválidas");
      localStorage.setItem("sityps_jwt", resp.token);
      setToken(resp.token);
      setLoginMail("");
      setLoginPass("");
      setOk("Sesión iniciada");
      await sleep(800);
      setOk("");
      void load();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusyLogin(false);
    }
  }

  function logout() {
    localStorage.removeItem("sityps_jwt");
    setToken("");
    setRows([]);
    setTotal(0);
  }

  // número de abiertos para badge
  const abiertos = useMemo(
    () => rows.filter((r) => ["nuevo", "en_proceso", "en_espera"].includes(r?.estado)).length,
    [rows]
  );

  function exportCSV() {
    const cols = [
      "folio",
      "fecha",
      "modulo",
      "tipo",
      "solicitante",
      "correo",
      "prioridad",
      "estado",
      "ultimoCorreo",
    ];
    const lines = [cols.join(",")];
    rows.forEach((r) => {
      const line = [
        safe(r.folio),
        safe(fmtDate(r.fecha || r.fechaISO)),
        safe(r.modulo),
        safe(r.tipo),
        safe(r.nombre || r.solicitante?.nombre),
        safe(r.correo || r.solicitante?.correo),
        safe(r.prioridad),
        safe(r.estado),
        safe(fmtDate(r.ultimoCorreo || r.ultimoCorreoISO)),
      ].join(",");
      lines.push(line);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tickets.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function safe(v) {
    const s = (v ?? "").toString().replaceAll('"', '""');
    return `"${s}"`;
  }

  async function inlineUpdateEstado(folio, nuevoEstado) {
    try {
      setSavingCell(folio);
      const resp = await fetchJSON(
        API.UPDATE,
        {
          method: "POST",
          body: JSON.stringify({
            folio,
            cambios: {
              estado: nuevoEstado,
              nota: `Estado cambiado a "${ESTADOS.find(([k]) => k === nuevoEstado)?.[1] || nuevoEstado}" desde vista de tabla.`,
            },
          }),
        },
        token
      );
      if (!resp.ok) throw new Error(resp.error || "No se pudo actualizar");
      setOk("Actualizado");
      await load();
      setTimeout(() => setOk(""), 800);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSavingCell("");
    }
  }

  async function saveFromModal(folio, cambios) {
    try {
      setSavingCell(folio);
      const resp = await fetchJSON(API.UPDATE, { method: "POST", body: JSON.stringify({ folio, cambios }) }, token);
      if (!resp.ok) throw new Error(resp.error || "No se pudo actualizar");
      setOk("Actualizado");
      await load();
      setTimeout(() => setOk(""), 800);
      setOpenView(null);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSavingCell("");
    }
  }

  // Paginación
  const pages = Math.max(1, Math.ceil(total / pageSize));

  /* ------------------- Vista de login si no hay sesión ------------------- */
  if (!user) {
    return (
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold mb-6">Backoffice — Tickets</h1>

        {error && <div className="mb-4 rounded border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>}
        {ok && <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">{ok}</div>}

        <form onSubmit={doLogin} className="max-w-md space-y-3 rounded-xl border bg-white p-5 shadow-sm">
          <div>
            <label className="block text-sm mb-1">Correo o usuario</label>
            <input
              className="w-full rounded border px-3 py-2 outline-none focus:ring"
              type="text" // permite usuario sin @
              placeholder="Ej. soporte o soporte@sityps.org.mx"
              required
              value={loginMail}
              onChange={(e) => setLoginMail(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">
              Si escribes sólo el usuario, se usará <code>@{DEFAULT_LOGIN_DOMAIN}</code>.
            </p>
          </div>
          <div>
            <label className="block text-sm mb-1">Contraseña</label>
            <input
              className="w-full rounded border px-3 py-2 outline-none focus:ring"
              type="password"
              required
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
            />
          </div>
          <button
            disabled={busyLogin}
            className="rounded bg-red-700 text-white px-4 py-2 disabled:opacity-60"
          >
            {busyLogin ? "Ingresando…" : "Ingresar"}
          </button>
          <p className="text-xs text-slate-500">Acceso restringido a personal autorizado del SITYPS.</p>
        </form>
      </section>
    );
  }

  /* ------------------------------ Vista principal ------------------------------ */
  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-1"></div>
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-semibold">Backoffice — Tickets</h1>
          <p className="text-slate-500 text-sm">Administra solicitudes y seguimiento.</p>
        </div>
        <div className="flex-1 flex justify-end">
          <UserBox user={user} abiertos={abiertos} onLogout={logout} />
        </div>
      </div>

      {error && <div className="mb-3 rounded border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>}
      {ok && <div className="mb-3 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">{ok}</div>}

      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end mb-4">
        <div className="flex-1">
          <label className="block text-sm mb-1">Buscar</label>
          <input
            className="w-full rounded border px-3 py-2 outline-none focus:ring"
            placeholder="Folio, nombre, correo, módulo, estado…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Estado</label>
          <select
            className="rounded border px-3 py-2 outline-none focus:ring min-w-[12rem]"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value);
              setPage(1);
            }}
          >
            <option value="todos">Todos</option>
            {ESTADOS.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Módulo</label>
          <select
            className="rounded border px-3 py-2 outline-none focus:ring min-w-[18rem]"
            value={modulo}
            onChange={(e) => {
              setModulo(e.target.value);
              setPage(1);
            }}
          >
            <option value="todos">Todos</option>
            {MODULOS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setQ("");
              setEstado("todos");
              setModulo("todos");
              setPage(1);
            }}
            className="rounded border px-3 py-2"
          >
            Limpiar filtros
          </button>
          <button onClick={exportCSV} className="rounded bg-slate-800 text-white px-3 py-2">
            Exportar CSV (filtrado)
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2 text-sm">
        <div>
          <span className="text-slate-500">{total} ticket(s)</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-slate-500">Por página</label>
          <select
            className="rounded border px-2 py-1"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border px-2 py-1 disabled:opacity-50"
            >
              ←
            </button>
            <span className="px-1">
              {page} / {pages}
            </span>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="rounded border px-2 py-1 disabled:opacity-50"
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2 w-[10rem]">Folio</th>
              <th className="text-left px-2 py-2 w-[12rem]">Fecha</th>
              <th className="text-left px-2 py-2">Módulo</th>
              <th className="text-left px-2 py-2">Tipo</th>
              <th className="text-left px-2 py-2">Solicitante</th>
              <th className="text-left px-2 py-2">Prioridad</th>
              <th className="text-left px-2 py-2 w-[12rem]">Estado</th>
              <th className="text-left px-2 py-2 w-[12rem]">Último correo</th>
              <th className="text-right px-2 py-2 w-[10rem]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                  Sin tickets
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r) => (
                <tr key={r.folio} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{r.folio}</td>
                  <td className="px-2 py-2">{fmtDate(r.fecha || r.fechaISO)}</td>
                  <td className="px-2 py-2">{r.modulo || "—"}</td>
                  <td className="px-2 py-2">{r.tipo || "—"}</td>
                  <td className="px-2 py-2">
                    <div className="leading-tight">
                      <div className="font-medium">{r.nombre || r.solicitante?.nombre || "—"}</div>
                      <div className="text-xs text-slate-500">{r.correo || r.solicitante?.correo || "—"}</div>
                    </div>
                  </td>
                  <td className="px-2 py-2">{pillPrioridad(r.prioridad || "—")}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      {pillEstado(r.estado)}
                      <select
                        disabled={savingCell === r.folio}
                        className="rounded border px-2 py-1 text-xs"
                        value={r.estado}
                        onChange={(e) => inlineUpdateEstado(r.folio, e.target.value)}
                      >
                        {ESTADOS.map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-2 py-2">{fmtDate(r.ultimoCorreo || r.ultimoCorreoISO)}</td>
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={() => setOpenView(r)}
                      className="rounded border px-3 py-1 hover:bg-slate-50"
                    >
                      Ver / Editar
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {openView && (
        <TicketModal
          saving={savingCell === openView.folio}
          ticket={openView}
          onClose={() => setOpenView(null)}
          onSave={saveFromModal}
        />
      )}
    </section>
  );
}

/* ============================================================
   Subcomponentes
   ============================================================ */
function UserBox({ user, abiertos, onLogout }) {
  const nombre = [user?.nombre, user?.apellidos].filter(Boolean).join(" ") || user?.name || "Usuario";
  const puesto = user?.puesto || user?.role || "Personal autorizado";
  const modulo = user?.modulo || user?.department || "";

  return (
    <div className="flex items-center gap-3">
      <div className="text-right leading-tight">
        <div className="font-semibold">{nombre}</div>
        <div className="text-xs text-slate-500">{puesto}</div>
        {modulo && <div className="text-xs text-slate-500">{modulo}</div>}
      </div>
      <div className="relative">
        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center font-semibold">
          {nombre?.[0]?.toUpperCase() || "U"}
        </div>
        <span
          title="Abiertos"
          className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-red-600 text-white text-xs flex items-center justify-center"
        >
          {abiertos}
        </span>
      </div>
      <button onClick={onLogout} className="ml-2 rounded border px-3 py-1 text-sm hover:bg-slate-50">
        Salir
      </button>
    </div>
  );
}

function TicketModal({ ticket, onClose, onSave, saving }) {
  const [prioridad, setPrioridad] = useState(ticket.prioridad || "Media");
  const [estado, setEstado] = useState(ticket.estado || "nuevo");
  const [asignadoA, setAsignadoA] = useState(ticket.asignadoA || "");
  const [nota, setNota] = useState("");

  const history = Array.isArray(ticket.history) ? ticket.history : ticket.historial || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div className="font-semibold">
            Ticket <span className="font-mono">{ticket.folio}</span>
          </div>
          <button onClick={onClose} className="rounded border px-2 py-1 text-sm hover:bg-slate-50">
            Cerrar
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 p-5">
          <div className="space-y-3">
            <div className="text-sm text-slate-500">Solicitante</div>
            <div className="rounded-md border p-3">
              <div className="font-medium">{ticket.nombre || ticket.solicitante?.nombre || "—"}</div>
              <div className="text-sm">{ticket.correo || ticket.solicitante?.correo || "—"}</div>
              <div className="text-xs text-slate-500">{ticket.telefono || ticket.solicitante?.telefono || "—"}</div>
            </div>

            <div className="text-sm text-slate-500">Clasificación</div>
            <div className="rounded-md border p-3">
              <div className="text-sm"><span className="text-slate-500">Módulo:</span> {ticket.modulo || "—"}</div>
              <div className="text-sm"><span className="text-slate-500">Tipo:</span> {ticket.tipo || "—"}</div>
              <div className="text-sm"><span className="text-slate-500">Fecha:</span> {fmtDate(ticket.fecha || ticket.fechaISO)}</div>
            </div>

            <div className="text-sm text-slate-500">Adjuntos</div>
            <div className="rounded-md border p-3 text-sm space-y-2">
              {ticket.acuseUrl ? (
                <a className="text-sky-600 underline" href={ticket.acuseUrl} target="_blank" rel="noreferrer">
                  Acuse RH
                </a>
              ) : (
                <div className="text-slate-400">Sin acuse</div>
              )}
              {Array.isArray(ticket.adjuntos) && ticket.adjuntos.length > 0 ? (
                <ul className="list-disc list-inside">
                  {ticket.adjuntos.map((a, i) => (
                    <li key={i}>
                      <a className="text-sky-600 underline" href={a.url || a.href} target="_blank" rel="noreferrer">
                        {a.name || a.nombre || `Adjunto ${i + 1}`}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-slate-400">Sin adjuntos</div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-slate-500">Actualizar</div>
            <div className="rounded-md border p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Estado</label>
                  <select
                    className="w-full rounded border px-2 py-2"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                  >
                    {ESTADOS.map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Prioridad</label>
                  <select
                    className="w-full rounded border px-2 py-2"
                    value={prioridad}
                    onChange={(e) => setPrioridad(e.target.value)}
                  >
                    {PRIORIDADES.map(([k]) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Asignado a (correo)</label>
                <input
                  className="w-full rounded border px-3 py-2"
                  placeholder="alguien@sityps.org.mx"
                  value={asignadoA}
                  onChange={(e) => setAsignadoA(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nota</label>
                <textarea
                  className="w-full min-h-[72px] rounded border px-3 py-2"
                  placeholder="Describe la acción o acuerdo…"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <button
                  disabled={saving}
                  onClick={() =>
                    onSave(ticket.folio, {
                      estado,
                      prioridad,
                      asignadoA: asignadoA || undefined,
                      nota: (nota || "").trim() || undefined,
                    })
                  }
                  className="rounded bg-red-700 text-white px-4 py-2 disabled:opacity-60"
                >
                  {saving ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </div>

            <div className="text-sm text-slate-500">Historial</div>
            <div className="rounded-md border p-3 max-h-[260px] overflow-auto">
              {Array.isArray(history) && history.length > 0 ? (
                <ul className="space-y-2">
                  {history
                    .slice()
                    .reverse()
                    .map((h, i) => (
                      <li key={i} className="text-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{h.actor || h.usuario || "Sistema"}</span>{" "}
                            <span className="text-slate-500">— {h.accion || h.action || "Actualización"}</span>
                          </div>
                          <div className="text-xs text-slate-500">{fmtDate(h.fecha || h.ts || h.fechaISO)}</div>
                        </div>
                        {h.nota && <div className="text-slate-700">{h.nota}</div>}
                        <div className="text-xs text-slate-500">
                          {h.estado && <>Estado: {h.estado} · </>}
                          {h.prioridad && <>Prioridad: {h.prioridad}</>}
                        </div>
                      </li>
                    ))}
                </ul>
              ) : (
                <div className="text-slate-400 text-sm">Sin movimientos</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
