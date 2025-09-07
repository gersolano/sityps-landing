import { useEffect, useMemo, useState } from "react";

const cx = (...k) => k.filter(Boolean).join(" ");
const badge = (estado) => {
  const e = String(estado || "").toLowerCase();
  if (e === "resuelto" || e === "cerrado") return "bg-emerald-100 text-emerald-700";
  if (e === "en_proceso" || e === "en proceso") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
};

export default function TicketDetalle() {
  // lee el folio de la URL #/backoffice/ticket/<folio>
  const folio = useMemo(() => {
    const h = window.location.hash || "";
    const m = h.match(/\/ticket\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  }, []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [t, setT] = useState(null);

  // edición
  const [estado, setEstado] = useState("");
  const [asignadoA, setAsignadoA] = useState("");
  const [prioridad, setPrioridad] = useState("Media");
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`/.netlify/functions/tickets-get?folio=${encodeURIComponent(folio)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo cargar el ticket");
      setT(data.ticket);
      setEstado(data.ticket?.estado || "nuevo");
      setAsignadoA(data.ticket?.asignadoA || "");
      setPrioridad(data.ticket?.prioridad || "Media");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function guardarCambios() {
    setSaving(true);
    setErr("");
    try {
      const body = { folio, cambios: { estado, asignadoA, prioridad, nota } };
      const res = await fetch("/.netlify/functions/tickets-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo actualizar");
      setNota("");
      setT(data.ticket);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { if (folio) load(); }, [folio]);

  if (!folio) return <div className="max-w-5xl mx-auto p-6">Folio no válido.</div>;
  if (loading) return <div className="max-w-5xl mx-auto p-6">Cargando…</div>;
  if (err) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-3">{err}</div>
        <div className="mt-4">
          <a className="text-sky-700 underline" href="#/backoffice">Volver</a>
        </div>
      </div>
    );
  }
  if (!t) return null;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ticket {t.folio}</h1>
          <p className="text-slate-600">
            {new Date(t.submittedAt || Date.now()).toLocaleString("es-MX")} ·{" "}
            <span className="font-medium">{t.moduloDestino}</span>
          </p>
        </div>
        <a className="text-sky-700 underline h-10" href="#/backoffice">Volver</a>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Datos */}
        <section className="md:col-span-2 rounded-xl border bg-white/80 p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className={cx("inline-flex px-2.5 py-1 rounded-full text-sm", badge(t.estado))}>
              {String(t.estado || "nuevo").replace("_"," ").toUpperCase()}
            </span>
            <span className="text-sm text-slate-500">Prioridad: {t.prioridad || "Media"}</span>
          </div>

          <h3 className="font-semibold mb-2">Contacto</h3>
          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <Info label="Nombre" value={t.nombre} />
            <Info label="Correo" value={t.correo} />
            <Info label="Teléfono" value={t.telefono} />
            <Info label="Unidad" value={t.unidadAdscripcion} />
            {t.curp ? <Info label="CURP" value={t.curp} /> : null}
            {t.rfc ? <Info label="RFC" value={t.rfc} /> : null}
          </div>

          <h3 className="font-semibold mb-2">Clasificación</h3>
          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <Info label="Secretaría / módulo" value={t.moduloDestino} />
            <Info label="Tipo de solicitud" value={t.tipo} />
          </div>

          {t.facilidades && (
            <>
              <h3 className="font-semibold mb-2">Facilidades administrativas</h3>
              <div className="grid md:grid-cols-2 gap-3 mb-4">
                <Info label="Institución" value={t.facilidades.institucion} />
                <Info label="Evento / incidencia" value={t.facilidades.tipoEvento} />
                <Info label="Solicitantes" value={t.facilidades.cantidadSolicitantes} />
                <Info label="Fechas solicitadas" value={t.facilidades.fechasSolicitadas} />
              </div>
            </>
          )}

          <h3 className="font-semibold mb-2">Descripción</h3>
          <p className="whitespace-pre-wrap text-slate-800">{t.descripcion || "—"}</p>

          {Array.isArray(t.adjuntos) && t.adjuntos.length > 0 && (
            <>
              <h3 className="font-semibold mt-6 mb-2">Adjuntos</h3>
              <ul className="list-disc list-inside text-slate-700">
                {t.adjuntos.map((a, i) => (
                  <li key={i}>{a.name} {a.size ? `(${a.size} B)` : ""}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Acciones */}
        <section className="rounded-xl border bg-white/80 p-5 space-y-4">
          <h3 className="font-semibold">Acciones</h3>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Estado</label>
            <select value={estado} onChange={(e) => setEstado(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="nuevo">nuevo</option>
              <option value="en_proceso">en_proceso</option>
              <option value="resuelto">resuelto</option>
              <option value="cerrado">cerrado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">Asignado a</label>
            <input value={asignadoA} onChange={(e) => setAsignadoA(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Nombre o correo" />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">Prioridad</label>
            <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
              <option value="Urgente">Urgente</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">Agregar nota</label>
            <textarea value={nota} onChange={(e) => setNota(e.target.value)}
              className="w-full min-h-[96px] rounded-md border border-slate-300 px-3 py-2"
              placeholder="Escribe una nota interna..." />
          </div>

          <button disabled={saving} onClick={guardarCambios}
            className="w-full rounded-md bg-slate-900 text-white px-4 py-2.5 hover:bg-black disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>

          <h3 className="font-semibold mt-6">Histórico</h3>
          <div className="space-y-2 max-h-64 overflow-auto pr-1">
            {(t.historico || []).slice().reverse().map((h, i) => (
              <div key={i} className="rounded border border-slate-200 bg-white px-3 py-2">
                <div className="text-xs text-slate-500">{new Date(h.at).toLocaleString()}</div>
                <div className="text-sm"><b>{h.action}</b>{h.value ? ` · ${h.value}` : ""}</div>
                <div className="text-xs text-slate-500">{h.by || "sistema"}</div>
                {h.notes ? <div className="text-sm mt-1">{h.notes}</div> : null}
              </div>
            ))}
            {(!t.historico || !t.historico.length) && <div className="text-slate-500 text-sm">Sin eventos.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-slate-800">{value || "—"}</div>
    </div>
  );
}
