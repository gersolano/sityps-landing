import { useEffect, useMemo, useState } from "react";

/* ───────── helpers ───────── */
function cls(...xs){ return xs.filter(Boolean).join(" "); }
function fmt(dt){
  if(!dt) return "—";
  try { return new Date(dt).toLocaleString("es-MX"); } catch { return String(dt); }
}
function Badge({ok, at}) {
  const color = ok ? "bg-green-100 text-green-800 ring-green-200" : "bg-red-100 text-red-800 ring-red-200";
  const label = ok ? "Enviado" : "Falló";
  return (
    <div className="flex items-start gap-2">
      <span className={cls("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", color)}>
        {label}
      </span>
      <span className="text-[11px] leading-5 text-slate-500">{fmt(at)}</span>
    </div>
  );
}
function uniq(xs){ return [...new Set(xs.filter(Boolean))]; }
function normalizeEstado(v){
  return String(v||"").toLowerCase().replace(/\s+/g,"_");
}
function humanEstado(v){
  return String(v||"").replace(/_/g," ").replace(/\b\w/g, c=>c.toUpperCase());
}
function csvEscape(x){
  const s = String(x ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g,'""')}"`;
  }
  return s;
}
function buildCSV(rows){
  const headers = [
    "Folio","Fecha","Módulo","Tipo","Nombre","Correo","Unidad",
    "Estado","Prioridad","Último correo OK","Último correo Fecha"
  ];
  const lines = [headers.join(",")];
  for(const t of rows){
    lines.push([
      csvEscape(t.folio),
      csvEscape(fmt(t.submittedAt)),
      csvEscape(t.moduloDestino || t.modulo || ""),
      csvEscape(t.tipo || ""),
      csvEscape(t.nombre || ""),
      csvEscape(t.correo || ""),
      csvEscape(t.unidadAdscripcion || ""),
      csvEscape(humanEstado(t.estado) || ""),
      csvEscape(t.prioridad || ""),
      csvEscape(t.lastMail?.ok ? "Sí" : (t.lastMail ? "No" : "—")),
      csvEscape(t.lastMail?.at ? fmt(t.lastMail.at) : "—"),
    ].join(","));
  }
  return lines.join("\n");
}
function downloadCSV(filename, text){
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.style.display = "none";
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
}

/* ───────── page ───────── */
export default function Backoffice(){
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  // filtros
  const [fEstado, setFEstado] = useState("todos");
  const [fModulo, setFModulo] = useState("todos");

  // botón reenviar
  const [busyFolio, setBusyFolio] = useState("");

  const load = async () => {
    setLoading(true);
    try{
      const r = await fetch("/.netlify/functions/tickets-list");
      const j = await r.json();
      if(j?.ok && Array.isArray(j.items)) setItems(j.items);
      else setItems([]);
    }catch{
      setItems([]);
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{ load(); }, []);

  // opciones únicas de filtros
  const estadosOpts = useMemo(()=>{
    const all = uniq(items.map(t => normalizeEstado(t.estado || ""))).filter(Boolean);
    // mantener orden común
    const order = ["nuevo","en_proceso","resuelto","cerrado"];
    const inOrder = order.filter(x => all.includes(x));
    const rest = all.filter(x => !inOrder.includes(x)).sort();
    return ["todos", ...inOrder, ...rest];
  }, [items]);

  const modulosOpts = useMemo(()=>{
    const all = uniq(items.map(t => (t.moduloDestino || t.modulo || "").trim())).filter(Boolean).sort();
    return ["todos", ...all];
  }, [items]);

  // rows filtradas
  const rows = useMemo(()=>{
    const term = q.trim().toLowerCase();
    return items.filter(t => {
      // filtro texto
      if (term) {
        const hay = [t.folio, t.nombre, t.correo, t.moduloDestino || t.modulo, t.tipo, t.estado, t.prioridad]
          .join(" ")
          .toLowerCase()
          .includes(term);
        if (!hay) return false;
      }
      // filtro estado
      if (fEstado !== "todos") {
        if (normalizeEstado(t.estado) !== fEstado) return false;
      }
      // filtro modulo
      if (fModulo !== "todos") {
        if ((t.moduloDestino || t.modulo || "").trim() !== fModulo) return false;
      }
      return true;
    });
  }, [items, q, fEstado, fModulo]);

  const clearFilters = () => { setQ(""); setFEstado("todos"); setFModulo("todos"); };

  const exportCSV = () => {
    if (rows.length === 0) return;
    const csv = buildCSV(rows);
    downloadCSV(`tickets_${Date.now()}.csv`, csv);
  };

  const resend = async (folio) => {
    setBusyFolio(folio);
    try{
      const r = await fetch("/.netlify/functions/tickets-notify", {
        method: "POST",
        headers: { "content-type":"application/json" },
        body: JSON.stringify({ folio, reason: "Reenvío manual desde backoffice" }),
      });
      const j = await r.json();
      if(j?.ok){
        await load();
        alert(`Notificación reenviada para ${folio}.`);
      }else{
        alert(`No se pudo reenviar: ${j?.error || "Error desconocido"}`);
      }
    }catch(e){
      alert(`No se pudo reenviar: ${e.message || e}`);
    }finally{
      setBusyFolio("");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Título */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight text-slate-800 text-center sm:text-left">
          Backoffice — Tickets
        </h1>
        <p className="text-sm text-slate-500">Administra solicitudes y seguimiento.</p>
      </div>

      {/* Controles: búsqueda + filtros + acciones */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600">Buscar</label>
          <input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            placeholder="Folio, nombre, correo, módulo, estado…"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600">Estado</label>
          <select
            value={fEstado}
            onChange={(e)=>setFEstado(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300"
          >
            {estadosOpts.map(v=>(
              <option key={v} value={v}>
                {v==="todos" ? "Todos" : humanEstado(v)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600">Módulo</label>
          <select
            value={fModulo}
            onChange={(e)=>setFModulo(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300"
          >
            {modulosOpts.map(v=>(
              <option key={v} value={v}>{v==="todos" ? "Todos" : v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Acciones sobre listado */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          {loading ? "Cargando…" : `${rows.length} ticket(s) mostrados`}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearFilters}
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Limpiar filtros
          </button>
          <button
            onClick={exportCSV}
            disabled={rows.length===0}
            className={cls(
              "inline-flex items-center rounded-md bg-slate-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800",
              rows.length===0 && "opacity-60 cursor-not-allowed"
            )}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2 font-semibold">Folio</th>
              <th className="px-3 py-2 font-semibold">Fecha</th>
              <th className="px-3 py-2 font-semibold">Módulo</th>
              <th className="px-3 py-2 font-semibold">Tipo</th>
              <th className="px-3 py-2 font-semibold">Solicitante</th>
              <th className="px-3 py-2 font-semibold">Estado</th>
              <th className="px-3 py-2 font-semibold">Prioridad</th>
              <th className="px-3 py-2 font-semibold">Último correo</th>
              <th className="px-3 py-2 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">Cargando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">Sin tickets</td></tr>
            ) : rows.map((t)=>(
              <tr key={t.folio} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-800">{t.folio}</td>
                <td className="px-3 py-2">{fmt(t.submittedAt)}</td>
                <td className="px-3 py-2">{t.moduloDestino || t.modulo || "—"}</td>
                <td className="px-3 py-2">{t.tipo || "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-col">
                    <span className="text-slate-800">{t.nombre || "—"}</span>
                    <span className="text-xs text-slate-500">{t.correo || "—"}</span>
                  </div>
                </td>
                <td className="px-3 py-2">{humanEstado(t.estado) || "—"}</td>
                <td className="px-3 py-2">{t.prioridad || "—"}</td>
                <td className="px-3 py-2">
                  {t.lastMail ? <Badge ok={!!t.lastMail.ok} at={t.lastMail.at || t.lastMailAt} /> : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end">
                    <button
                      onClick={()=>resend(t.folio)}
                      disabled={busyFolio === t.folio}
                      className={cls(
                        "inline-flex items-center rounded-md bg-rose-600 px-3 py-1.5 text-white text-sm font-medium shadow-sm hover:bg-rose-700",
                        busyFolio===t.folio && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      {busyFolio===t.folio ? "Reenviando…" : "Reenviar correo"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
