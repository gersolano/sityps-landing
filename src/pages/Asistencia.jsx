import React, { useState } from "react";

const MODULOS = [
  { value: "afiliacion", label: "Afiliación" },
  { value: "demandas", label: "Asuntos laborales" },
  { value: "escalafon", label: "Escalafón y Promoción de Plazas" },
  { value: "finanzas", label: "Finanzas" },
  { value: "prestaciones", label: "Créditos, Vivienda y Prestaciones" },
];

const TIPOS = [
  { value: "conflicto-laboral", label: "Conflicto laboral" },
  { value: "facilidades", label: "Facilidades administrativas" },
  { value: "consulta", label: "Consulta / asesoría" },
  { value: "otro", label: "Otro" },
];

export default function Asistencia() {
  const [form, setForm] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    unidadAdscripcion: "",
    curp: "",
    rfc: "",
    moduloDestino: "",
    tipo: "",
    descripcion: "",
    facilidades: {
      cantidadSolicitantes: 1,
      fechasSolicitadas: "",
      tipoEvento: "",
      institucion: "Servicios de Salud de Oaxaca",
    },
    acuseAdjuntado: false,
  });

  const [sending, setSending] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [dialogOk, setDialogOk] = useState(false);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }
  function setFac(name, value) {
    setForm((f) => ({ ...f, facilidades: { ...f.facilidades, [name]: value } }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErrMsg("");
    setOkMsg("");

    // Validaciones mínimas que exige la función
    if (!form.nombre || !form.correo || !form.moduloDestino || !form.tipo || !form.descripcion) {
      setErrMsg("Completa nombre, correo, módulo, tipo y descripción.");
      return;
    }
    // Si es "facilidades", verificar acuse
    if (form.tipo === "facilidades" && !form.acuseAdjuntado) {
      setErrMsg("Debes confirmar que adjuntaste el acuse a RH para facilitar la gestión.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/.netlify/functions/tickets-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          correo: form.correo,
          telefono: form.telefono,
          unidadAdscripcion: form.unidadAdscripcion,
          curp: form.curp,
          rfc: form.rfc,
          moduloDestino: form.moduloDestino, // 👈 CLAVE CORRECTA
          tipo: form.tipo,                   // 👈 CLAVE CORRECTA
          descripcion: form.descripcion,     // 👈 CLAVE CORRECTA
          facilidades:
            form.tipo === "facilidades"
              ? {
                  cantidadSolicitantes: Number(form.facilidades.cantidadSolicitantes || 1),
                  fechasSolicitadas: form.facilidades.fechasSolicitadas || "",
                  tipoEvento: form.facilidades.tipoEvento || "",
                  institucion: form.facilidades.institucion || "",
                }
              : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setErrMsg(data?.error || "No se pudo registrar el ticket.");
        return;
      }

      setOkMsg(`Ticket creado: ${data.ticket.folio}`);
      setDialogOk(true);

      // limpiar
      setForm({
        nombre: "",
        correo: "",
        telefono: "",
        unidadAdscripcion: "",
        curp: "",
        rfc: "",
        moduloDestino: "",
        tipo: "",
        descripcion: "",
        facilidades: {
          cantidadSolicitantes: 1,
          fechasSolicitadas: "",
          tipoEvento: "",
          institucion: "Servicios de Salud de Oaxaca",
        },
        acuseAdjuntado: false,
      });
    } catch (err) {
      setErrMsg("No se pudo registrar el ticket.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4">
      <div className="rounded-2xl bg-gradient-to-b from-primary-800 to-primary-700 text-white p-6 mt-4">
        <h1 className="text-3xl font-bold">Mesa de Asistencia</h1>
        <p className="mt-1 text-white/90">
          ¿Tienes una solicitud o problema? Registra tu ticket y el equipo correspondiente te atenderá.
        </p>
      </div>

      {errMsg && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {errMsg}
        </div>
      )}
      {okMsg && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
          {okMsg}
        </div>
      )}

      <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
        {/* Datos personales */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-600">Nombre completo</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={form.nombre}
              onChange={(e) => setField("nombre", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">Correo</label>
            <input
              type="email"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={form.correo}
              onChange={(e) => setField("correo", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">Teléfono</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={form.telefono}
              onChange={(e) => setField("telefono", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">Unidad de adscripción (opcional)</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={form.unidadAdscripcion}
              onChange={(e) => setField("unidadAdscripcion", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">CURP (opcional)</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={form.curp}
              onChange={(e) => setField("curp", e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">RFC (opcional)</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={form.rfc}
              onChange={(e) => setField("rfc", e.target.value.toUpperCase())}
            />
          </div>
        </div>

        {/* Clasificación */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-slate-600">Módulo destino</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={form.moduloDestino}
              onChange={(e) => setField("moduloDestino", e.target.value)}
            >
              <option value="">Selecciona…</option>
              {MODULOS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600">Tipo de solicitud</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={form.tipo}
              onChange={(e) => setField("tipo", e.target.value)}
            >
              <option value="">Selecciona…</option>
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="text-sm text-slate-600">Descripción</label>
          <textarea
            rows={5}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={form.descripcion}
            onChange={(e) => setField("descripcion", e.target.value)}
          />
        </div>

        {/* Facilidades administrativas (condicional) */}
        {form.tipo === "facilidades" && (
          <div className="rounded-xl border p-4 bg-primary-50/40">
            <div className="font-medium mb-2">Facilidades administrativas</div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-600">Institución</label>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={form.facilidades.institucion}
                  onChange={(e) => setFac("institucion", e.target.value)}
                >
                  <option>Servicios de Salud de Oaxaca</option>
                  <option>Servicios de Salud IMSS-Bienestar</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-600">Cantidad de solicitantes</label>
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={form.facilidades.cantidadSolicitantes}
                  onChange={(e) => setFac("cantidadSolicitantes", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">Fechas solicitadas</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="Por ejemplo: 5-7 Oct 2025"
                  value={form.facilidades.fechasSolicitadas}
                  onChange={(e) => setFac("fechasSolicitadas", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">Tipo de evento/incidencia</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="Comisión, capacitación, evento, etc."
                  value={form.facilidades.tipoEvento}
                  onChange={(e) => setFac("tipoEvento", e.target.value)}
                />
              </div>
            </div>

            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={form.acuseAdjuntado}
                onChange={(e) => setField("acuseAdjuntado", e.target.checked)}
              />
              Confirmo que adjunté el acuse entregado a RH de mi unidad.
            </label>
          </div>
        )}

        <div className="flex gap-3">
          <button
            disabled={sending}
            className="rounded-lg bg-primary-600 text-white px-5 py-2 hover:bg-primary-700 disabled:opacity-60"
          >
            {sending ? "Enviando…" : "Registrar ticket"}
          </button>
        </div>
      </form>

      {/* Modal de confirmación */}
      {dialogOk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold">¡Solicitud enviada!</h3>
            <p className="mt-2 text-slate-600">
              Tu ticket fue registrado correctamente. Podrás dar seguimiento desde el Backoffice.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                className="rounded-lg bg-primary-600 text-white px-4 py-2"
                onClick={() => setDialogOk(false)}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
