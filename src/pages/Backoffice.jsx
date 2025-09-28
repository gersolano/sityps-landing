// src/pages/Backoffice.jsx
import React, { useEffect, useMemo, useState } from "react";
import TicketEditor from "./TicketEditor";

const API = {
  AUTH: "/.netlify/functions/auth",
  LIST: "/.netlify/functions/tickets-list",
  GET: "/.netlify/functions/tickets-get",
  UPDATE: "/.netlify/functions/tickets-update",
  EXPORT: "/.netlify/functions/tickets-export",
};

const ESTADOS = ["Nuevo", "En proceso", "En espera", "Resuelto", "Cerrado"];
const PRIORIDADES = ["Baja", "Normal", "Alta", "Crítica"];
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
  return Number.isNaN(+d) ? iso : d.toLocaleString();
};
const decodeJWT = (t) => {
  try {
    const [, p] = t.split(".");
    const j = atob(p.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(j)));
  } catch {
    return null;
  }
};
async function fetchJSON(url, opts = {}, token) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}
async function fetchBlob(url, token) {
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}
const csvEscape = (v = "") => `"${String(v).replace(/"/g, '""')}"`;

const Badge = ({ text }) => (
  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{text}</span>
);
const Circle = ({ name }) => {
  const c = (name || "").trim().charAt(0).toUpperCase() || "U";
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-700 text-sm font-semibold">
      {c}
    </span>
  );
};

export default function Backoffice() {
  const [token, setToken] = useState(() => localStorage.getItem("sityps_jwt") || "");
  const user = useMemo(() => (token ? decodeJWT(token) : null), [token]);

  const [filters, setFilters] = useState({ q: "", estado: "Todos", modulo: "Todos" });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingCell, setSavingCell] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [editor, setEditor] = useState({ open: false, folio: null });

  // login
  const [loginMail, setLoginMail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [busyLogin, setBusyLogin] = useState(false);

  const normalizeEmail = (input, defaultDomain = "sityps.org.mx") => {
    const v = String(input || "").trim();
    if (!v) return v;
    if (v.includes("@")) return v;
    return `${v}@${defaultDomain}`;
  };

  async function doLogin(e) {
    e.preventDefault();
    setBusyLogin(true);
    setError("");
    try {
      const email = normalizeEmail(loginMail, "sityps.org.mx");
      const data = await fetchJSON("/.netlify/functions/auth", {
        method: "POST",
        body: JSON.stringify({ email, password: loginPass }),
      });
      if (!data?.ok || !data?.token) throw new Error(data?.error || "Inicio de sesión inválido");
      localStorage.setItem("sityps_jwt", data.token);
      setToken(data.token);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusyLogin(false);
    }
  }

  async function load(serverFiltered = false) {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const url = new URL(API.LIST, window.location.origin);
      if (serverFiltered) {
        if (filters.q) url.searchParams.set("q", filters.q);
        if (filters.estado !== "Todos") url.searchParams.set("estado", filters.estado);
        if (filters.modulo !== "Todos") url.searchParams.set("modulo", filters.modulo);
      }
      const data = await fetchJSON(url.toString(), {}, token);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setItems([]);
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load(true);
  }, [token]);

  const view = useMemo(() => {
    const q = (filters.q || "").toLowerCase();
    const est = (filters.estado || "").toLowerCase();
    const mod = (filters.modulo || "").toLowerCase();
    return items.filter((r) => {
      let p = true;
      if (q) {
        const t = [r.folio, r.modulo, r.tipo, r.solicitante, r.prioridad, r.estado]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        p = p && t.includes(q);
      }
      if (est !== "todos") p = p && String(r.estado || "").toLowerCase() === est;
      if (mod !== "todos") p = p && String(r.modulo || "").toLowerCase() === mod;
      return p;
    });
  }, [items, filters]);

  async function inlineUpdateEstado(folio, nuevoEstado) {
    try {
      setSavingCell(folio);
      const resp = await fetchJSON(
        API.UPDATE,
        { method: "POST", body: JSON.stringify({ folio, estado: nuevoEstado, notify: "1", _editor: "backoffice" }) },
        token
      );
      if (!resp?.ok) throw new Error(resp?.error || "No se pudo actualizar");
      setItems((prev) =>
        prev.map((x) =>
          x.folio === folio ? { ...x, estado: nuevoEstado, ultimoCorreo: resp.ticket?.ultimoCorreo || x.ultimoCorreo } : x
        )
      );
      setOk("Actualizado");
      setTimeout(() => setOk(""), 1000);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSavingCell("");
    }
  }

  async function exportServerCSV() {
    try {
      const blob = await fetchBlob(API.EXPORT, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tickets.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch (e) {
      setError(String(e.message || e));
    }
  }
  async function exportExtendedCSV() {
    try {
      const detalles = [];
      for (const r of view) {
        try {
          const det = await fetchJSON(`${API.GET}?folio=${encodeURIComponent(r.folio)}`, {}, token);
          const t = det?.ticket || {};
          detalles.push({
            folio: r.folio,
            fecha: r.fecha,
            modulo: r.modulo,
            tipo: r.tipo,
            solicitante: r.nombre || r.solicitante || "",
            correo: t.correo || "",
            telefono: t.telefono || "",
            adscripcion: t.adscripcion || t.unidad || "",
            prioridad: r.prioridad || "",
            estado: r.estado || "",
            ultimoCorreo: r.ultimoCorreo || "",
          });
        } catch {}
      }
      const headers = [
        "folio",
        "fecha",
        "modulo",
        "tipo",
        "solicitante",
        "correo",
        "telefono",
        "adscripcion",
        "prioridad",
        "estado",
        "ultimoCorreo",
      ];
      const lines = [headers.map(csvEscape).join(",")].concat(
        detalles.map((d) => headers.map((h) => csvEscape(d[h] || "")).join(","))
      );
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tickets-extendido.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  function logout() {
    localStorage.removeItem("sityps_jwt");
    setToken("");
    setItems([]);
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md p-6">
        <h1 className="mb-4 text-2xl font-bold">Backoffice — Iniciar sesión</h1>
        {error && <p className="mb-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{error}</p>}
        <form onSubmit={doLogin} className="space-y-3">
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Correo o usuario (ej. soporte)"
            type="text"
            value={loginMail}
            onChange={(e) => setLoginMail(e.target.value)}
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Contraseña"
            type="password"
            value={loginPass}
            onChange={(e) => setLoginPass(e.target.value)}
          />
          <button disabled={busyLogin} className="rounded bg-red-600 px-4 py-2 font-medium text-white disabled:opacity-50">
            {busyLogin ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{user?.puesto || user?.rol || "Soporte"}</span>
          <h1 className="text-2xl font-bold">Backoffice — Tickets</h1>
        </div>
        <div className="flex items-center gap-3">
          <Circle name={user?.nombre} />
          <div className="leading-4">
            <div className="text-sm font-medium">{user?.nombre || "Usuario"}</div>
            <div className="text-xs text-slate-500">{user?.puesto || user?.rol || "Soporte"}</div>
          </div>
          <button onClick={logout} className="rounded border px-3 py-1 text-sm hover:bg-gray-50">Salir</button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          className="rounded border px-3 py-2"
          placeholder="Folio, nombre, módulo…"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />
        <select
          className="rounded border px-3 py-2"
          value={filters.estado}
          onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
        >
          {["Todos", ...ESTADOS].map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </select>
        <select
          className="rounded border px-3 py-2"
          value={filters.modulo}
          onChange={(e) => setFilters((f) => ({ ...f, modulo: e.target.value }))}
        >
          {["Todos", ...MODULOS].map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </select>

        <button onClick={() => load(true)} className="rounded bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700">
          Aplicar filtros
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => load(true)} className="rounded border px-3 py-2 hover:bg-gray-50">Recargar</button>
          <button onClick={exportServerCSV} className="rounded bg-slate-800 px-3 py-2 text-white hover:bg-slate-900">
            Exportar CSV
          </button>
          <button onClick={exportExtendedCSV} className="rounded bg-red-700 px-3 py-2 text-white hover:bg-red-800">
            Exportar CSV (extendido)
          </button>
        </div>
      </div>

      {error && <div className="mb-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{error}</div>}
      {ok && <div className="mb-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">{ok}</div>}

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2 w-[10rem]">Folio</th>
              <th className="text-left px-2 py-2 w-[12rem]">Fecha</th>
              <th className="text-left px-2 py-2">Módulo</th>
              <th className="text-left px-2 py-2">Tipo</th>
              <th className="text-left px-2 py-2">Solicitante</th>
              <th className="text-left px-2 py-2">Prioridad</th>
              <th className="text-left px-2 py-2 w-[12rem]">Estado</th>
              <th className="text-left px-2 py-2 w-[12rem]">Último correo</th>
              <th className="text-right px-2 py-2 w-[9rem]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Cargando…</td></tr>
            )}
            {!loading && view.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Sin tickets</td></tr>
            )}
            {!loading && view.map((r) => (
              <tr key={r.folio} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono">{r.folio}</td>
                <td className="px-2 py-2">{fmtDate(r.fecha)}</td>
                <td className="px-2 py-2">{r.modulo || "—"}</td>
                <td className="px-2 py-2">{r.tipo || "—"}</td>
                <td className="px-2 py-2">{r.nombre || r.solicitante || "—"}</td>
                <td className="px-2 py-2"><Badge text={r.prioridad || "—"} /></td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    {savingCell === r.folio ? (
                      <Badge text="Guardando…" />
                    ) : (
                      <>
                        <Badge text={r.estado || "—"} />
                        <select
                          className="rounded border px-2 py-1 text-xs"
                          value={r.estado || "Nuevo"}
                          onChange={(e) => inlineUpdateEstado(r.folio, e.target.value)}
                        >
                          {ESTADOS.map((x) => <option key={x} value={x}>{x}</option>)}
                        </select>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2">{fmtDate(r.ultimoCorreo)}</td>
                <td className="px-2 py-2 text-right">
                  <button
                    onClick={() => setEditor({ open: true, folio: r.folio })}
                    className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    Ver / Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

            {/* editor modal */}
      {editor.open && (
        <TicketEditor
          folio={editor.folio}
          token={token}
          currentUser={user}
          canAdmin={
            ["admin", "soporte", "root"].includes(String(user?.rol || "").toLowerCase()) ||
            /admin|soporte/i.test(String(user?.puesto || ""))
          }
          onClose={() => setEditor({ open: false, folio: null })}
          onSaved={(saved) =>
            setItems((prev) =>
              prev.map((x) =>
                x.folio === saved.folio
                  ? {
                      ...x,
                      estado: saved.estado,
                      prioridad: saved.prioridad,
                      modulo: saved.modulo,
                      tipo: saved.tipo,
                      solicitante: saved.nombre || x.solicitante,
                      ultimoCorreo: saved.ultimoCorreo || x.ultimoCorreo,
                    }
                  : x
              )
            )
          }
          onTransferred={(res) => {
            if (!res?.ok || !res?.ticket) return;
            const t = res.ticket;
            setItems((prev) =>
              prev.map((x) =>
                x.folio === t.folio ? { ...x, modulo: t.modulo, tipo: t.tipo } : x
              )
            );
          }}
          ESTADOS={ESTADOS}
          PRIORIDADES={PRIORIDADES}
          MODULOS={MODULOS}
        />
      )}
    </section>
  );
}

