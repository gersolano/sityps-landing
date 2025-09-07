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
function uniq(xs){ return [...new Set((xs||[]).filter(Boolean))]; }
function normalizeEstado(v){ return String(v||"").toLowerCase().replace(/\s+/g,"_"); }
function humanEstado(v){ return String(v||"").replace(/_/g," ").replace(/\b\w/g, c=>c.toUpperCase()); }
function csvEscape(x){
  const s = String(x ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g,'""')}"`;
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

/* ───────── sort helpers ───────── */
const PRIORITY_WEIGHT = { "Alta": 3, "Media": 2, "Baja": 1 };
function cmp(a,b){
  if (a===b) return 0;
  if (a===undefined || a===null) return -1;
  if (b===undefined || b===null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "es", { sensitivity: "base", numeric: true });
}
function getSortVal(t, key){
  switch(key){
    case "folio": return t.folio || "";
    case "submittedAt": return t.submittedAt ? +new Date(t.submittedAt) : 0;
    case "modulo": return (t.moduloDestino || t.modulo || "");
    case "tipo": return t.tipo || "";
    case "solicitante": return t.nombre || "";
    case "estado": return normalizeEstado(t.estado || "");
    case "prioridad": return PRIORITY_WEIGHT[t.prioridad] || 0;
    case "lastMailAt": return t.lastMail?.at ? +new Date(t.lastMail.at) : 0;
    default: return "";
  }
}
function SortHeader({label, colKey, sortKey, sortDir, onSort, className}){
  const active = sortKey === colKey;
  const icon = !active ? "↕" : (sortDir === "asc" ? "▲" : "▼");
  return (
    <button
      type="button"
      onClick={()=>onSort(colKey)}
      className={cls("group inline-flex items-center gap-1 font-semibold", className)}
      title={active ? `Ordenado ${sortDir==="asc"?"ascendente":"descendente"}` : "Ordenar"}
    >
      <span>{label}</span>
      <span className={cls("text-xs opacity-60 group-hover:opacity-100", active && "opacity-100")}>{icon}</span>
    </button>
  );
}

/* ───────── page ───────── */
export default function Backoffice(){
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  // filtros
  const [fEstado, setFEstado] = useState("todos");
  const [fModulo, setFModulo] = useState("todos");

  // orden
  const [sortKey, setSortKey] = useState("submittedAt");
  const [sortDir, setSortDir] = useState("desc"); // asc | desc

  // paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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
  const filtered = useMemo(()=>{
    const term = q.trim().toLowerCase();
    return items.filter(t => {
      if (term) {
        const hay = [t.folio, t.nombre, t.correo, t.moduloDestino || t.modulo, t.tipo, t.estado, t.prioridad]
          .join(" ")
          .toLowerCase()
          .includes(term);
        if (!hay) return false;
      }
      if (fEstado !== "todos" && normalizeEstado(t.estado) !== fEstado) return false;
      if (fModulo !== "todos" && (t.moduloDestino || t.modulo || "").trim() !== fModulo) return false;
      return true;
    });
  }, [items, q, fEstado, fModulo]);

  // ordenadas
  const sorted = useMemo(()=>{
    const arr = filtered.slice();
    arr.sort((a,b)=>{
      const va = getSortVal(a, sortKey);
      const vb = getSortVal(b, sortKey);
      const r = cmp(va, vb);
      return sortDir === "asc" ? r : -r;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  // paginadas
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const rows = sorted.slice(start, end);

  // acciones UI
  const clearFilters = () => { setQ(""); setFEstado("todos"); setFModulo("todos"); };
  const onSort = (key) => {
    if (key === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key==="submittedAt" ? "desc" : "asc"); }
  };
  useEffect(()=>{ setPage(1); }, [q, fEstado, fModulo, pageSize]); // reset paginación al filtrar/cambiar tamaño

  const exportCSV = () => {
    if (sorted.length === 0) return;
    const csv = buildCSV(sorted); // exporta TODO el filtrado, no solo la página
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

      {/* Controles: búsqueda + filtros */}
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
              <option key={v} value={v}>{v==="todos" ? "Todos" : humanEstado(v)}</option>
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

      {/* Acciones + paginación superior */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span>{loading ? "Cargando…" : `${total} ticket(s)`}</span>
          <span className="hidden sm:inline-block text-slate-400">•</span>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600">Por página</label>
            <select
              value={pageSize}
              onChange={(e)=>setPageSize(Number(e.target.value))}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-rose-300"
            >
              {[10,25,50,100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-slate-500">{total === 0 ? "0–0" : `${start+1}–${Math.min(end,total)}`} de {total}</span>
          </div>
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
            disabled={sorted.length===0}
            className={cls(
              "inline-flex items-center rounded-md bg-slate-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800",
              sorted.length===0 && "opacity-60 cursor-not-allowed"
            )}
          >
            Exportar CSV (filtrado)
          </button>
          {/* Paginación */}
          <div className="flex items-center gap-1">
            <button
              onClick={()=>setPage(1)}
              disabled={currentPage<=1}
              className={cls("rounded-md px-2 py-1 text-sm border", currentPage<=1 ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-50 border-slate-300")}
              title="Primera página"
            >«</button>
            <button
              onClick={()=>setPage(p=>Math.max(1,p-1))}
              disabled={currentPage<=1}
              className={cls("rounded-md px-2 py-1 text-sm border", currentPage<=1 ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-50 border-slate-300")}
              title="Anterior"
            >‹</button>
            <span className="mx-1 text-sm text-slate-600">{currentPage} / {totalPages}</span>
            <button
              onClick={()=>setPage(p=>Math.min(totalPages,p+1))}
              disabled={currentPage>=totalPages}
              className={cls("rounded-md px-2 py-1 text-sm border", currentPage>=totalPages ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-50 border-slate-300")}
              title="Siguiente"
            >›</button>
            <button
              onClick={()=>setPage(totalPages)}
              disabled={currentPage>=totalPages}
              className={cls("rounded-md px-2 py-1 text-sm border", currentPage>=totalPages ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-50 border-slate-300")}
              title="Última página"
            >»</button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">
                <SortHeader label="Folio" colKey="folio" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              </th>
              <th className="px-3 py-2">
                <SortHeader label="Fecha" colKey="submittedAt" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              </th>
              <th className="px-3 py-2">
                <SortHeader label="Módulo" colKey="modulo" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              </th>
              <th className="px-3 py-2">
                <SortHeader label="Tipo" colKey="tipo" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              </th>
              <th className="px-3 py-2">
                <SortHeader label="Solicitante" colKey="solicitante" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              </th>
              <th className="px-3 py-2">
                <SortHeader label="Estado" colKey="estado" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              </th>
              <th className="px-3 py-2">
                <SortHeader label="Prioridad" colKey="prioridad" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              </th>
              <th className="px-3 py-2">
                <SortHeader label="Último correo" colKey="lastMailAt" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              </th>
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

      {/* paginación inferior */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button
          onClick={()=>setPage(1)}
          disabled={currentPage<=1}
          className={cls("rounded-md px-3 py-1.5 text-sm border", currentPage<=1 ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-50 border-slate-300")}
          title="Primera página"
        >«</button>
        <button
          onClick={()=>setPage(p=>Math.max(1,p-1))}
          disabled={currentPage<=1}
          className={cls("rounded-md px-3 py-1.5 text-sm border", currentPage<=1 ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-50 border-slate-300")}
          title="Anterior"
        >‹</button>
        <span className="mx-1 text-sm text-slate-600">{currentPage} / {totalPages}</span>
        <button
          onClick={()=>setPage(p=>Math.min(totalPages,p+1))}
          disabled={currentPage>=totalPages}
          className={cls("rounded-md px-3 py-1.5 text-sm border", currentPage>=totalPages ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-50 border-slate-300")}
          title="Siguiente"
        >›</button>
        <button
          onClick={()=>setPage(totalPages)}
          disabled={currentPage>=totalPages}
          className={cls("rounded-md px-3 py-1.5 text-sm border", currentPage>=totalPages ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-50 border-slate-300")}
          title="Última página"
        >»</button>
      </div>
    </div>
  );
}
