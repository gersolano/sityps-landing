// C:\SITYPSAPP\sityps-landing\src\pages\TicketEditor.jsx
import React, { useEffect, useMemo, useState } from "react";
import RESPONSABLES_POR_MODULO, { normalizeModulo, MODULOS_LIST } from "../data/responsables";

const API = {
  GET: "/.netlify/functions/tickets-get",
  UPDATE: "/.netlify/functions/tickets-update",
  TRANSFER: "/.netlify/functions/tickets-transfer",
  ATTACH: "/.netlify/functions/attachments-download",
};

function field(v) {
  return v ?? "—";
}

// Helpers de adjuntos
function findAttachmentKey(obj) {
  if (!obj) return null;
  // posibles nombres que guardamos
  return obj.acuseKey || obj.blobKey || obj.path || obj.key || null;
}
function suggestFileName(att, fallback = "archivo.bin") {
  return (
    att?.filename ||
    att?.name ||
    att?.nombre ||
    att?.title ||
    fallback
  );
}
function attachHref({ key, name }) {
  if (!key) return null;
  const u = new URL(API.ATTACH, window.location.origin);
  u.searchParams.set("key", key);
  if (name) u.searchParams.set("name", name);
  return u.toString();
}

export default function TicketEditor({
  folio,
  token,
  currentUser,
  canAdmin = false,
  onClose,
  onSaved,
  onTransferred,
  ESTADOS = ["Nuevo", "En proceso", "Resuelto", "Cerrado"],
  PRIORIDADES = ["Baja", "Normal", "Alta", "Crítica"],
  MODULOS = MODULOS_LIST,
}) {
  const [tab, setTab] = useState("resumen");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [t, setT] = useState(null);

  // edición
  const [estado, setEstado] = useState("Nuevo");
  const [prioridad, setPrioridad] = useState("Normal");
  const [nota, setNota] = useState("");
  const [notify, setNotify] = useState(true);

  // transferencia (sólo admin)
  const [transferTo, setTransferTo] = useState("");
  const [txBusy, setTxBusy] = useState(false);
  const [txMsg, setTxMsg] = useState("");

  // responsable (derivado del módulo)
  const responsable = useMemo(() => {
    const mod = normalizeModulo(t?.modulo || "");
    return RESPONSABLES_POR_MODULO[mod] || null;
  }, [t?.modulo]);

  async function fetchJSON(url, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      let m = `HTTP ${res.status}`;
      try {
        const j = await res.json();
        if (j?.error) m = j.error;
      } catch {}
      throw new Error(m);
    }
    return res.json();
  }

  useEffect(() => {
    if (!folio) return;
    (async () => {
      setErr("");
      try {
        const data = await fetchJSON(`${API.GET}?folio=${encodeURIComponent(folio)}`);
        const tk = data.ticket || {};
        setT(tk);
        setEstado(tk.estado || "Nuevo");
        setPrioridad(tk.prioridad || "Normal");
      } catch (e) {
        setErr(String(e.message || e));
      }
    })();
  }, [folio]);

  // Guardar actualización (estado / prioridad / nota)
  async function saveChanges() {
    if (!t) return;
    setBusy(true);
    setErr("");
    setOk("");
    try {
      const body = {
        folio,
        estado,
        prioridad,
        nota: nota?.trim() || undefined,
        notify: notify ? "1" : "",
        _editor: "backoffice",
      };
      const resp = await fetchJSON(API.UPDATE, { method: "POST", body: JSON.stringify(body) });
      if (!resp?.ok) throw new Error(resp?.error || "No se pudo actualizar");
      setOk("Actualizado");
      setT(resp.ticket);
      onSaved && onSaved(resp.ticket);
      setNota("");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  // Transferencia de ticket (sólo admin)
  async function doTransfer() {
    if (!t || !transferTo) return;
    setTxBusy(true);
    setTxMsg("");
    setErr("");
    try {
      const body = {
        folio,
        fromModulo: t.modulo,
        toModulo: transferTo,
        notify: "1", // notificar al solicitante
        _editor: String(currentUser?.rol || currentUser?.puesto || "backoffice"),
      };
      const resp = await fetchJSON(API.TRANSFER, { method: "POST", body: JSON.stringify(body) });
      if (!resp?.ok) throw new Error(resp?.error || "No se pudo transferir");
      setT(resp.ticket);
      onTransferred && onTransferred(resp);
      setTxMsg("Transferido correctamente.");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setTxBusy(false);
    }
  }

  // Adjuntos (acuse único + listado de adjuntos)
  const acuseAtt = t?.facilidades || null;
  const acuseKey = findAttachmentKey(acuseAtt);
  const acuseName = suggestFileName(acuseAtt, "acuse.pdf");
  const acuseUrl = acuseKey ? attachHref({ key: acuseKey, name: acuseName }) : null;

  const adjuntos = Array.isArray(t?.adjuntos) ? t.adjuntos : [];
  const adjListado = adjuntos
    .map((att) => {
      const key = findAttachmentKey(att);
      const name = suggestFileName(att, "adjunto.bin");
      const url = key ? attachHref({ key, name }) : null;
      return { key, name, url };
    })
    .filter((x) => !!x.key && !!x.url);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-3" onKeyDown={(e)=>{/* sin atajos */}}>
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header con tabs */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Ticket {folio}</h2>
          <button className="rounded border px-3 py-1 hover:bg-gray-50" onClick={onClose}>Cerrar</button>
        </div>

        <div className="flex gap-2 border-b px-4 pt-3">
          <button
            className={`rounded-t-md px-3 py-2 text-sm ${tab === "resumen" ? "bg-slate-100 font-medium" : "hover:bg-slate-50"}`}
            onClick={() => setTab("resumen")}
          >
            Resumen
          </button>
          <button
            className={`rounded-t-md px-3 py-2 text-sm ${tab === "editar" ? "bg-slate-100 font-medium" : "hover:bg-slate-50"}`}
            onClick={() => setTab("editar")}
          >
            Editar
          </button>
        </div>

        {err && <div className="mx-4 mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{err}</div>}
        {ok && <div className="mx-4 mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">{ok}</div>}

        {/* CONTENIDO */}
        <div className="max-h-[70vh] overflow-y-auto px-4 pb-4 pt-3">
          {!t && <div className="py-16 text-center text-slate-500">Cargando…</div>}

          {t && tab === "resumen" && (
            <>
              {/* responsable */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-slate-500 mb-1">Responsable</div>
                  <div className="font-medium">{field(responsable?.nombre)}</div>
                  <div className="text-sm">{field(responsable?.puesto)}</div>
                  <div className="text-sm text-slate-600">{field(responsable?.correo)}</div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-slate-500 mb-1">Solicitante</div>
                  <div className="font-medium">{field(t.nombre)}</div>
                  <div className="text-sm">{field(t.correo)}</div>
                  <div className="text-sm">{field(t.telefono)}</div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-slate-500 mb-1">Clasificación</div>
                  <div><b>Módulo:</b> {field(t.modulo)}</div>
                  <div><b>Tipo:</b> {field(t.tipo)}</div>
                  <div><b>Fecha:</b> {t?.createdAt ? new Date(t.createdAt).toLocaleString() : "—"}</div>
                </div>
              </div>

              {/* adjuntos */}
              <div className="mt-3 rounded-lg border p-3">
                <div className="mb-2 text-sm font-medium">Adjuntos</div>

                {/* Acuse (si existe) */}
                {acuseUrl ? (
                  <div className="mb-2">
                    <div className="text-xs text-slate-500">Acuse</div>
                    <a className="text-sky-700 underline" href={acuseUrl} target="_blank" rel="noreferrer">
                      Descargar {acuseName}
                    </a>
                  </div>
                ) : null}

                {/* Lista de demás adjuntos */}
                {adjListado.length > 0 ? (
                  <ul className="list-disc pl-5">
                    {adjListado.map((a, idx) => (
                      <li key={`${a.key}-${idx}`}>
                        <a className="text-sky-700 underline" href={a.url} target="_blank" rel="noreferrer">
                          {a.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : !acuseUrl ? (
                  <div className="text-slate-500">No disponible para descarga</div>
                ) : null}
              </div>

              {/* historial */}
              <div className="mt-3 rounded-lg border p-3">
                <div className="mb-2 text-sm font-medium">Historial</div>
                {Array.isArray(t.historial) && t.historial.length > 0 ? (
                  <div className="space-y-2">
                    {t.historial
                      .slice()
                      .reverse()
                      .map((h, i) => (
                        <div key={i} className="rounded bg-slate-50 p-2">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{h.por || "—"}</div>
                            <div className="text-xs text-slate-500">
                              {h.fecha ? new Date(h.fecha).toLocaleString() : "—"}
                            </div>
                          </div>
                          {Array.isArray(h.cambios) && h.cambios.length > 0 && (
                            <ul className="ml-4 list-disc text-sm">
                              {h.cambios.map((c, j) =>
                                c.campo === "nota" ? (
                                  <li key={j}>Nota: {c.nota}</li>
                                ) : (
                                  <li key={j}>
                                    {c.campo}: {c.antes} → {c.despues}
                                  </li>
                                )
                              )}
                            </ul>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-slate-500">Sin movimientos</div>
                )}
              </div>
            </>
          )}

          {t && tab === "editar" && (
            <>
              {/* responsable (sólo lectura) */}
              <div className="rounded-lg border p-3 mb-3">
                <div className="text-xs text-slate-500 mb-1">Responsable</div>
                <div className="font-medium">{field(responsable?.nombre)}</div>
                <div className="text-sm">{field(responsable?.puesto)}</div>
                <div className="text-sm text-slate-600">{field(responsable?.correo)}</div>
              </div>

              {/* actualizar */}
              <div className="rounded-lg border p-3">
                <div className="mb-2 text-sm font-medium">Actualizar / Editar</div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <select className="rounded border px-3 py-2" value={estado} onChange={(e) => setEstado(e.target.value)}>
                    {ESTADOS.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded border px-3 py-2"
                    value={prioridad}
                    onChange={(e) => setPrioridad(e.target.value)}
                  >
                    {PRIORIDADES.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  className="mt-2 h-28 w-full rounded border px-3 py-2"
                  placeholder="Describe la acción o acuerdo…"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                />
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                  Enviar notificación por correo
                </label>

                {/* Adjuntar archivos del backoffice al correo (pendiente) */}
                <div className="mt-2 text-sm text-slate-600">
                  Adjuntar archivos <span className="text-slate-400">(se enviarán en el correo)</span>
                </div>
                <input className="mt-1" type="file" multiple onChange={() => {/* opcional */}} />

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={saveChanges}
                    disabled={busy}
                    className="rounded bg-red-600 px-4 py-2 font-medium text-white disabled:opacity-50"
                  >
                    {busy ? "Guardando…" : "Guardar cambios"}
                  </button>
                </div>
              </div>

              {/* Transferencia de ticket (sólo admin) */}
              {canAdmin && (
                <div className="mt-3 rounded-lg border p-3">
                  <div className="mb-2 text-sm font-medium">Transferencia de ticket</div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Secretaría actual</div>
                      <div className="rounded border bg-slate-50 px-3 py-2">{field(t.modulo)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Transferir a</div>
                      <select
                        className="w-full rounded border px-3 py-2"
                        value={transferTo}
                        onChange={(e) => setTransferTo(e.target.value)}
                      >
                        <option value="">Selecciona secretaría…</option>
                        {MODULOS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end justify-end">
                      <button
                        onClick={doTransfer}
                        disabled={!transferTo || txBusy}
                        className="rounded bg-slate-800 px-4 py-2 font-medium text-white disabled:opacity-50"
                      >
                        {txBusy ? "Transfiriendo…" : "Aplicar transferencia"}
                      </button>
                    </div>
                  </div>
                  {txMsg && <div className="mt-2 text-emerald-700">{txMsg}</div>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
