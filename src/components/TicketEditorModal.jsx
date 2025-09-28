// src/components/TicketEditorModal.jsx
import React, { useEffect, useState } from 'react';
import { getTicket, updateTicket, fmtDate } from '../lib/ticketsApi';

export default function TicketEditorModal({ folio, open, onClose, onSaved }) {
  const [t, setT] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notify, setNotify] = useState(true);
  const [nota, setNota] = useState('');
  const [asignadoA, setAsignadoA] = useState('');

  useEffect(() => {
    if (!open || !folio) return;
    setLoading(true); setError('');
    getTicket(folio)
      .then((tk) => { setT(tk); setAsignadoA(tk.asignadoA || ''); })
      .catch((e) => setError(e.message || 'Error al cargar'))
      .finally(() => setLoading(false));
  }, [open, folio]);

  function set(field, value) { setT(prev => ({ ...prev, [field]: value })); }

  async function handleSave() {
    if (!t) return;
    setSaving(true); setError('');
    try {
      const saved = await updateTicket({
        folio: t.folio,
        estado: t.estado,
        prioridad: t.prioridad,
        modulo: t.modulo,
        tipo: t.tipo,
        nombre: t.nombre,
        correo: t.correo,
        telefono: t.telefono,
        descripcion: t.descripcion,
        asignadoA,
        nota,
        notify: notify ? '1' : '0',
        _editor: 'backoffice',
      });
      onSaved?.(saved);
      onClose?.();
    } catch (e) {
      setError(e.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">Ticket {folio}</h3>
          <button onClick={onClose} className="rounded-lg px-3 py-1 text-sm hover:bg-gray-100">Cerrar</button>
        </div>

        {loading && <p className="text-gray-600">Cargando…</p>}
        {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        {!loading && t && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Solicitante */}
            <div>
              <h4 className="mb-2 font-medium text-slate-600">Solicitante</h4>
              <div className="rounded-xl border p-3 text-sm">
                <div>{t.nombre || '—'}</div>
                <div>{t.correo || '—'}</div>
                <div>{t.telefono || '—'}</div>
              </div>
            </div>

            {/* Actualizar */}
            <div>
              <h4 className="mb-2 font-medium text-slate-600">Actualizar</h4>
              <div className="grid grid-cols-2 gap-2">
                <select className="rounded-lg border p-2" value={t.estado || 'Nuevo'}
                        onChange={(e)=>set('estado', e.target.value)}>
                  {['Nuevo','En proceso','Resuelto','Cerrado'].map(x => <option key={x} value={x}>{x}</option>)}
                </select>
                <select className="rounded-lg border p-2" value={t.prioridad || 'Normal'}
                        onChange={(e)=>set('prioridad', e.target.value)}>
                  {['Baja','Normal','Alta','Crítica'].map(x => <option key={x} value={x}>{x}</option>)}
                </select>
                <input className="col-span-2 rounded-lg border p-2"
                       placeholder="Asignado a (correo)"
                       value={asignadoA}
                       onChange={e=>setAsignadoA(e.target.value)} />
                <textarea rows={4} className="col-span-2 rounded-lg border p-2"
                          placeholder="Describe la acción o acuerdo…"
                          value={nota}
                          onChange={e=>setNota(e.target.value)} />
                <label className="col-span-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={notify} onChange={e=>setNotify(e.target.checked)} />
                  Enviar notificación por correo
                </label>
              </div>
            </div>

            {/* Clasificación */}
            <div>
              <h4 className="mb-2 font-medium text-slate-600">Clasificación</h4>
              <div className="rounded-xl border p-3 text-sm">
                <div><b>Módulo:</b> {t.modulo || '—'}</div>
                <div><b>Tipo:</b> {t.tipo || '—'}</div>
                <div><b>Fecha:</b> {fmtDate(t.createdAt)}</div>
              </div>
            </div>

            {/* Adjuntos */}
            <div>
              <h4 className="mb-2 font-medium text-slate-600">Adjuntos</h4>
              <div className="rounded-xl border p-3 text-sm">
                {(t.adjuntos && t.adjuntos.length > 0)
                  ? <ul className="list-disc pl-5">{t.adjuntos.map((a,i)=><li key={i}>{a.name} <span className="text-xs text-slate-500">({a.contentType||'archivo'})</span></li>)}</ul>
                  : <div>Sin adjuntos</div>}
              </div>
            </div>

            {/* Historial */}
            <div className="md:col-span-2">
              <h4 className="mb-2 font-medium text-slate-600">Historial</h4>
              <div className="rounded-xl border p-3 text-sm">
                {Array.isArray(t.historial) && t.historial.length
                  ? (
                    <ul className="space-y-2">
                      {t.historial.map((h, i) => (
                        <li key={i} className="rounded bg-slate-50 p-2">
                          <div className="text-xs text-slate-500">{fmtDate(h.fecha)} · {h.por || '—'}</div>
                          <ul className="ml-4 list-disc">
                            {h.cambios.map((c, j) => (
                              <li key={j}>
                                {c.campo === 'nota'
                                  ? <i>Nota:</i>
                                  : <b>{c.campo}</b>
                                } {c.nota ? c.nota : (<span>{c.antes || '—'} → {c.despues || '—'}</span>)}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  ) : <div>Sin movimientos</div>}
              </div>
            </div>

            {/* Guardar */}
            <div className="md:col-span-2 flex justify-end">
              <button onClick={handleSave} disabled={saving}
                      className="rounded-xl bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
