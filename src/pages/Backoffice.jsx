import { useEffect, useMemo, useState } from "react";

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

export default function Backoffice(){
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
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

  const rows = useMemo(()=>{
    const term = q.trim().toLowerCase();
    if(!term) return items;
    return items.filter(t =>
      [t.folio, t.nombre, t.correo, t.moduloDestino || t.modulo, t.tipo, t.estado, t.prioridad]
        .join(" ").toLowerCase().includes(term)
    );
  }, [items, q]);

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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-[220px]">
          <h1 className="text-xl font-semibold tracking-tight text-slate-800 text-center sm:text-left">
            Backoffice — Tickets
          </h1>
        </div>
        <div className="w-full sm:w-72">
          <label className="block text-xs font-medium text-slate-600">Buscar</label>
          <input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            placeholder="Folio, nombre, correo, módulo, estado…"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
      </div>

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
                <td className="px-3 py-2">{(t.estado||"").replace(/_/g," ") || "—"}</td>
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
