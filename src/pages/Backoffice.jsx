import React, { useEffect, useState } from "react";
import {
  getToken,
  clearSession,
  listTickets,
  getTicket,
  updateTicket,
  getCurrentUser,
} from "../shared/api";

const ESTADOS = ["nuevo", "en_proceso", "resuelto", "cerrado"];

export default function Backoffice() {
  const account = getCurrentUser();

  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    modulo: "",
    tipo: "",
    estado: "",
  });
  const [rows, setRows] = useState([]);
  const [sel, setSel] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      window.location.hash = "#/admin";
      return;
    }
    (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function refresh() {
    const res = await listTickets(filters);
    setRows(res.tickets || []);
  }

  async function onRowClick(folio) {
    const r = await getTicket(folio);
    setSel(r.ticket || null);
  }

  async function onSavePatch() {
    if (!sel?.folio) return;
    setSaving(true);
    try {
      const patch = {
        estado: sel.estado,
        prioridad: sel.prioridad,
        asignadoA: sel.asignadoA || "",
        notas: sel.notas || "",
      };
      const r = await updateTicket(sel.folio, patch);
      setSel(r.ticket);
      await refresh();
    } catch {
      alert("No se pudo guardar cambios");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="px-4 py-6">Cargando…</div>;

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Encabezado: badge izquierda, título centrado, usuario/Salir a la derecha */}
      <div className="mt-4 mb-3 grid grid-cols-1 md:grid-cols-3 items-center">
        <div className="flex justify-center md:justify-start">
          <RoleBadge role={account?.role} />
        </div>

        <h1 className="text-2xl font-semibold text-slate-800 text-center">
          Backoffice — Tickets
        </h1>

        <div className="mt-3 md:mt-0 flex items-center justify-center md:justify-end gap-3">
          <div className="text-right leading-tight">
            <div className="text-sm font-medium text-slate-800">
              {account?.displayName || account?.user || "Usuario"}
            </div>
            <div className="text-xs text-slate-500">
              {account?.puesto || account?.role || ""}
            </div>
          </div>
          <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700">
            {(account?.displayName || account?.user || "U").slice(0, 1).toUpperCase()}
          </div>
          <button
            onClick={() => {
              clearSession();
              window.location.hash = "#/admin";
            }}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid md:grid-cols-5 gap-3 mb-4">
        <input
          placeholder="Buscar (folio, nombre, correo)"
          className="rounded-lg border px-3 py-2 text-sm"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
        <input
          placeholder="Módulo (afiliacion, demandas, ...)"
          className="rounded-lg border px-3 py-2 text-sm"
          value={filters.modulo}
          onChange={(e) => setFilters((f) => ({ ...f, modulo: e.target.value }))}
        />
        <input
          placeholder="Tipo ID (conflicto-laboral, facilidades…)"
          className="rounded-lg border px-3 py-2 text-sm"
          value={filters.tipo}
          onChange={(e) => setFilters((f) => ({ ...f, tipo: e.target.value }))}
        />
        <select
          className="rounded-lg border px-3 py-2 text-sm"
          value={filters.estado}
          onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
        >
          <option value="">Estado (todos)</option>
          {ESTADOS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={refresh}
          className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm"
        >
          Aplicar
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="text-left px-3 py-2">Folio</th>
              <th className="text-left px-3 py-2">Fecha</th>
              <th className="text-left px-3 py-2">Módulo</th>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-left px-3 py-2">Nombre</th>
              <th className="text-left px-3 py-2">Prioridad</th>
              <th className="text-left px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.folio}
                className="border-t hover:bg-slate-50 cursor-pointer"
                onClick={() => onRowClick(r.folio)}
              >
                <td className="px-3 py-2">{r.folio}</td>
                <td className="px-3 py-2">
                  {new Date(r.submittedAt).toLocaleString("es-MX", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </td>
                <td className="px-3 py-2">{r.moduloDestino}</td>
                <td className="px-3 py-2">{r.tipo}</td>
                <td className="px-3 py-2">{r.nombre}</td>
                <td className="px-3 py-2">{r.prioridad}</td>
                <td className="px-3 py-2">{r.estado}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detalle */}
      {sel && (
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border p-4">
            <h2 className="text-lg font-medium text-slate-800 mb-2">
              Ticket {sel.folio}
            </h2>
            <div className="text-sm text-slate-700 space-y-1">
              <div>
                <b>Fecha:</b>{" "}
                {new Date(sel.submittedAt).toLocaleString("es-MX", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
              <div>
                <b>Módulo:</b> {sel.moduloDestino}
              </div>
              <div>
                <b>Tipo:</b> {sel.tipo}
              </div>
              <div>
                <b>Nombre:</b> {sel.nombre}
              </div>
              <div>
                <b>Correo:</b> {sel.correo}
              </div>
              <div>
                <b>Teléfono:</b> {sel.telefono}
              </div>
              <div>
                <b>Unidad:</b> {sel.unidadAdscripcion}
              </div>
              {sel.curp && (
                <div>
                  <b>CURP:</b> {sel.curp}
                </div>
              )}
              {sel.rfc && (
                <div>
                  <b>RFC:</b> {sel.rfc}
                </div>
              )}
              <div className="mt-2">
                <b>Descripción:</b>
                <br />
                {sel.descripcion}
              </div>

              {sel.facilidades && (
                <div className="mt-3 rounded-lg bg-primary-50/50 border border-primary-100 p-3">
                  <div className="font-medium">Facilidades Administrativas</div>
                  <div className="text-xs mt-1">
                    <div>
                      <b>Cantidad solicitantes:</b>{" "}
                      {sel.facilidades.cantidadSolicitantes}
                    </div>
                    <div>
                      <b>Fechas solicitadas:</b>{" "}
                      {sel.facilidades.fechasSolicitadas}
                    </div>
                    <div>
                      <b>Tipo de evento/incidencia:</b>{" "}
                      {sel.facilidades.tipoEvento}
                    </div>
                    <div>
                      <b>Institución:</b> {sel.facilidades.institucion}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <h3 className="text-lg font-medium mb-2">Gestión</h3>
            <div className="grid gap-3">
              <div>
                <label className="text-xs text-slate-600">Estado</label>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={sel.estado}
                  onChange={(e) => setSel((s) => ({ ...s, estado: e.target.value }))}
                >
                  {ESTADOS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600">Prioridad</label>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={sel.prioridad}
                  onChange={(e) =>
                    setSel((s) => ({ ...s, prioridad: e.target.value }))
                  }
                >
                  <option>Alta</option>
                  <option>Media</option>
                  <option>Baja</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600">Asignado a</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={sel.asignadoA || ""}
                  onChange={(e) =>
                    setSel((s) => ({ ...s, asignadoA: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Notas</label>
                <textarea
                  rows={5}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={sel.notas || ""}
                  onChange={(e) => setSel((s) => ({ ...s, notas: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <button
                  disabled={saving}
                  onClick={onSavePatch}
                  className="rounded-lg bg-primary-600 text-white px-4 py-2 text-sm hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? "Guardando…" : "Guardar cambios"}
                </button>
                <button
                  onClick={() => setSel(null)}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <h4 className="mt-5 font-medium">Histórico</h4>
            <div className="mt-2 text-xs text-slate-600 space-y-1 max-h-40 overflow-auto">
              {(sel.historico || [])
                .slice()
                .reverse()
                .map((h, i) => (
                  <div key={i}>
                    • {new Date(h.at).toLocaleString("es-MX")} — {h.by}: {h.action}{" "}
                    {h.notes ? `(${h.notes})` : ""}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Badge por rol (mismo criterio) */
function RoleBadge({ role }) {
  const meta = roleMeta(role);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.classes}`}
      title={meta.title}
    >
      {meta.label}
    </span>
  );
}

function roleMeta(role) {
  const r = String(role || "").toLowerCase().trim();
  const map = {
    admin: { label: "Admin", title: "Administrador", classes: "bg-slate-100 text-slate-800 border-slate-200" },
    afiliacion: { label: "Afiliación", title: "Secretaría de Organización, Actas y Acuerdos", classes: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    demandas: { label: "Asuntos Laborales", title: "Secretaría de Asuntos Laborales", classes: "bg-rose-100 text-rose-800 border-rose-200" },
    laborales: { label: "Asuntos Laborales", title: "Secretaría de Asuntos Laborales", classes: "bg-rose-100 text-rose-800 border-rose-200" },
    finanzas: { label: "Finanzas", title: "Secretaría de Finanzas", classes: "bg-amber-100 text-amber-800 border-amber-200" },
    formacion: { label: "Formación", title: "Secretaría de Formación", classes: "bg-sky-100 text-sky-800 border-sky-200" },
    escalafon: { label: "Escalafón", title: "Secretaría de Escalafón", classes: "bg-indigo-100 text-indigo-800 border-indigo-200" },
    prestaciones: { label: "Prestaciones", title: "Créditos, Vivienda y Prestaciones", classes: "bg-teal-100 text-teal-800 border-teal-200" },
    prensa: { label: "Prensa", title: "Relaciones, Prensa y Propaganda", classes: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200" },
    cultura: { label: "Cultura/Deporte", title: "Fomento Cultural y Deportivo", classes: "bg-purple-100 text-purple-800 border-purple-200" },
    "deporte-cultura": { label: "Deporte/Cultura", title: "Fomento Cultural y Deportivo", classes: "bg-violet-100 text-violet-800 border-violet-200" },
    equidad: { label: "Mujer y Equidad", title: "La Mujer y Equidad de Género", classes: "bg-pink-100 text-pink-800 border-pink-200" },
    "honor-justicia": { label: "Honor y Justicia", title: "Comité de Honor y Justicia", classes: "bg-gray-100 text-gray-800 border-gray-200" },
    electoral: { label: "Electoral", title: "Comité Electoral", classes: "bg-orange-100 text-orange-800 border-orange-200" },
    consultorios: { label: "Consultorios", title: "Consultorios/Convenios", classes: "bg-lime-100 text-lime-800 border-lime-200" },
    soporte: { label: "Soporte", title: "Soporte Técnico", classes: "bg-zinc-100 text-zinc-800 border-zinc-200" },
    "region-tuxtepec": { label: "Región Tuxtepec", title: "Representante Regional Tuxtepec", classes: "bg-cyan-100 text-cyan-800 border-cyan-200" },
    "region-pochutla": { label: "Región Pochutla", title: "Representante Regional Pochutla", classes: "bg-cyan-100 text-cyan-800 border-cyan-200" },
    "region-valle-centrales": { label: "Valles Centrales", title: "Representante Regional Valles Centrales", classes: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  };
  return map[r] || { label: r || "Rol", title: r || "Rol", classes: "bg-slate-100 text-slate-800 border-slate-200" };
}
