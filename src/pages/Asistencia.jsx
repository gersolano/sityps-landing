import React, { useState } from "react";

/* ========= Catálogo de Secretarías / Módulos (valores estables) ========= */
const SECRETARIAS = [
  { value: "organizacion", label: "Organización, Actas y Acuerdos" },
  { value: "afiliacion", label: "Afiliación (por Organización)" },
  { value: "laborales", label: "Asuntos Laborales" },
  { value: "formacion", label: "Formación, Capacitación y Desarrollo" },
  { value: "escalafon", label: "Escalafón y Promoción de Plazas" },
  { value: "prestaciones", label: "Créditos, Vivienda y Prestaciones Económicas" },
  { value: "relaciones", label: "Relaciones, Prensa y Propaganda" },
  { value: "finanzas", label: "Finanzas" },
  { value: "cultura", label: "Fomento Cultural y Deportivo" },
  { value: "mujer", label: "Mujer y Equidad de Género" },
  { value: "honor", label: "Comité de Honor y Justicia" },
  { value: "electoral", label: "Comité Electoral" },
];

/* ========= Tipos de solicitud ========= */
const TIPOS = [
  { value: "facilidades", label: "Facilidades administrativas" },
  { value: "conflicto-laboral", label: "Conflicto laboral" },
  { value: "consulta", label: "Consulta / asesoría" },
  { value: "tramite", label: "Trámite administrativo" },
  { value: "otro", label: "Otro" },
];

/* ========= Tipos de evento/incidencia para facilidades ========= */
const EVENTOS_FAC = [
  "Comisión sindical",
  "Asamblea",
  "Capacitación",
  "Evento sindical",
  "Trámite administrativo",
  "Otro",
];

/* ========= Institución por defecto para facilidades ========= */
const INSTITUCIONES = [
  "Servicios de Salud de Oaxaca",
  "Servicios de Salud IMSS-Bienestar",
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

    // Facilidades
    facilidades: {
      institucion: INSTITUCIONES[0],
      cantidadSolicitantes: 1,
      tipoEvento: "",
      otroTipoEvento: "",
      // lista de periodos: [{from:'YYYY-MM-DD', to:'YYYY-MM-DD' | ''}]
      fechas: [],
      // campos temporales del selector
      from: "",
      to: "",
    },

    // Archivo (acuse) — opcional pero recomendable para facilidades
    acuseKey: "", // clave devuelta por la función de subida
    acuseName: "",
  });

  const [sending, setSending] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [dialogOk, setDialogOk] = useState(false);
  const [uploading, setUploading] = useState(false);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }
  function setFac(name, value) {
    setForm((f) => ({ ...f, facilidades: { ...f.facilidades, [name]: value } }));
  }

  function addPeriodo() {
    const { from, to } = form.facilidades;
    if (!from) return;
    const periodo = { from, to: to || "" };
    setFac("fechas", [...form.facilidades.fechas, periodo]);
    setFac("from", "");
    setFac("to", "");
  }

  function removePeriodo(idx) {
    const arr = [...form.facilidades.fechas];
    arr.splice(idx, 1);
    setFac("fechas", arr);
  }

  async function onUploadAcuse(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setErrMsg("El archivo supera 4MB. Comprime antes de subir.");
      return;
    }
    setErrMsg("");
    setOkMsg("");
    setUploading(true);
    try {
      const base64 = await readAsDataURL(file); // data:<mime>;base64,XXXXX
      const res = await fetch("/.netlify/functions/acuse-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mime: file.type || "application/octet-stream",
          base64,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.key) {
        setErrMsg(data?.error || "No se pudo subir el archivo.");
        return;
      }
      setField("acuseKey", data.key);
      setField("acuseName", file.name);
      setOkMsg("Archivo cargado correctamente.");
    } catch (err) {
      setErrMsg("No se pudo subir el archivo.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErrMsg("");
    setOkMsg("");

    // Validaciones mínimas
    if (!form.nombre || !form.correo || !form.moduloDestino || !form.tipo || !form.descripcion) {
      setErrMsg("Completa nombre, correo, módulo, tipo y descripción.");
      return;
    }
    if (form.tipo === "facilidades") {
      if (form.facilidades.fechas.length === 0) {
        setErrMsg("Agrega al menos una fecha o periodo para las facilidades.");
        return;
      }
      if (!form.facilidades.tipoEvento) {
        setErrMsg("Selecciona el tipo de evento/incidencia en facilidades.");
        return;
      }
    }

    setSending(true);
    try {
      // Convertimos la lista de periodos a una cadena legible
      const fechasSolicitadas = form.facilidades.fechas
        .map((p) => (p.to ? `${p.from} → ${p.to}` : p.from))
        .join(", ");

      const tipoEventoFinal =
        form.facilidades.tipoEvento === "Otro" && form.facilidades.otroTipoEvento
          ? form.facilidades.otroTipoEvento
          : form.facilidades.tipoEvento;

      const res = await fetch("/.netlify/functions/tickets-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          correo: form.correo,
          telefono: form.telefono,
          unidadAdscripcion: form.unidadAdscripcion,
          curp: form.curp ? form.curp.toUpperCase() : "",
          rfc: form.rfc ? form.rfc.toUpperCase() : "",
          moduloDestino: form.moduloDestino,  // 👈 clave correcta
          tipo: form.tipo,                    // 👈 clave correcta
          descripcion: form.descripcion,      // 👈 clave correcta
          acuseKey: form.acuseKey || "",

          facilidades:
            form.tipo === "facilidades"
              ? {
                  institucion: form.facilidades.institucion,
                  cantidadSolicitantes: Number(form.facilidades.cantidadSolicitantes || 1),
                  tipoEvento: tipoEventoFinal,
                  fechasSolicitadas,
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

      // Restablecer formulario
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
          institucion: INSTITUCIONES[0],
          cantidadSolicitantes: 1,
          tipoEvento: "",
          otroTipoEvento: "",
          fechas: [],
          from: "",
          to: "",
        },
        acuseKey: "",
        acuseName: "",
      });
    } catch {
      setErrMsg("No se pudo registrar el ticket.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4">
      {/* Encabezado visual */}
      <div className="rounded-2xl bg-gradient-to-b from-primary-800 to-primary-700 text-white p-6 mt-4">
        <h1 className="text-3xl font-bold">Mesa de Asistencia</h1>
        <p className="mt-1 text-white/90">
          Registra tu ticket y el equipo correspondiente te atenderá.
        </p>
      </div>

      {/* Avisos */}
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

      {/* Formulario */}
      <form className="mt-5 grid gap-6" onSubmit={onSubmit}>
        {/* Datos personales */}
        <section className="grid gap-4">
          <h2 className="text-lg font-semibold">Datos de contacto</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Nombre completo" value={form.nombre} onChange={(v) => setField("nombre", v)} />
            <Input label="Correo" type="email" value={form.correo} onChange={(v) => setField("correo", v)} />
            <Input label="Teléfono" value={form.telefono} onChange={(v) => setField("telefono", v)} />
            <Input label="Unidad de adscripción (opcional)" value={form.unidadAdscripcion} onChange={(v) => setField("unidadAdscripcion", v)} />
            <Input label="CURP (opcional)" value={form.curp} onChange={(v) => setField("curp", v.toUpperCase())} />
            <Input label="RFC (opcional)" value={form.rfc} onChange={(v) => setField("rfc", v.toUpperCase())} />
          </div>
        </section>

        {/* Clasificación */}
        <section className="grid gap-4">
          <h2 className="text-lg font-semibold">Clasificación</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Select
              label="Secretaría / Módulo destino"
              value={form.moduloDestino}
              onChange={(v) => setField("moduloDestino", v)}
              options={SECRETARIAS}
              placeholder="Selecciona…"
            />
            <Select
              label="Tipo de solicitud"
              value={form.tipo}
              onChange={(v) => setField("tipo", v)}
              options={TIPOS}
              placeholder="Selecciona…"
            />
          </div>
        </section>

        {/* Descripción */}
        <section className="grid gap-2">
          <h2 className="text-lg font-semibold">Descripción</h2>
          <label className="text-sm text-slate-600">Describe tu solicitud</label>
          <textarea
            rows={5}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={form.descripcion}
            onChange={(e) => setField("descripcion", e.target.value)}
          />
        </section>

        {/* Facilidades (condicional) */}
        {form.tipo === "facilidades" && (
          <section className="grid gap-4 rounded-xl border p-4 bg-primary-50/40">
            <h2 className="text-lg font-semibold">Facilidades administrativas</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <SelectSimple
                label="Institución"
                value={form.facilidades.institucion}
                onChange={(v) => setFac("institucion", v)}
                options={INSTITUCIONES}
              />
              <Input
                label="Cantidad de solicitantes"
                type="number"
                min={1}
                value={form.facilidades.cantidadSolicitantes}
                onChange={(v) => setFac("cantidadSolicitantes", v)}
              />

              <SelectSimple
                label="Tipo de evento/incidencia"
                value={form.facilidades.tipoEvento}
                onChange={(v) => setFac("tipoEvento", v)}
                options={EVENTOS_FAC}
                placeholder="Selecciona…"
              />
              {form.facilidades.tipoEvento === "Otro" && (
                <Input
                  label="Especifica el evento"
                  value={form.facilidades.otroTipoEvento}
                  onChange={(v) => setFac("otroTipoEvento", v)}
                />
              )}
            </div>

            {/* Selector visual de fechas */}
            <div className="grid gap-2">
              <label className="text-sm text-slate-600">Fechas / periodos solicitados</label>
              <div className="grid md:grid-cols-[1fr,1fr,auto] gap-2">
                <input
                  type="date"
                  className="rounded-lg border px-3 py-2"
                  value={form.facilidades.from}
                  onChange={(e) => setFac("from", e.target.value)}
                />
                <input
                  type="date"
                  className="rounded-lg border px-3 py-2"
                  value={form.facilidades.to}
                  onChange={(e) => setFac("to", e.target.value)}
                  min={form.facilidades.from || undefined}
                  placeholder="Opcional"
                />
                <button type="button" onClick={addPeriodo} className="rounded-lg bg-primary-600 text-white px-3 py-2">
                  Agregar
                </button>
              </div>

              {form.facilidades.fechas.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.facilidades.fechas.map((p, idx) => (
                    <span
                      key={`${p.from}-${p.to}-${idx}`}
                      className="inline-flex items-center gap-2 rounded-full bg-white border px-3 py-1 shadow-sm"
                    >
                      <span className="text-sm">
                        {p.to ? `${p.from} → ${p.to}` : p.from}
                      </span>
                      <button
                        type="button"
                        className="text-red-600 hover:underline"
                        onClick={() => removePeriodo(idx)}
                        title="Eliminar"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Subida de acuse */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm text-slate-600">Acuse entregado a RH (opcional)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={onUploadAcuse}
                  disabled={uploading}
                  className="block w-full rounded-lg border px-3 py-2 bg-white"
                />
                <p className="text-xs text-slate-500">
                  PDF/JPG/PNG, máx. 4MB. Se adjuntará como evidencia para agilizar la gestión.
                </p>
                {form.acuseName && (
                  <p className="text-sm text-emerald-700">
                    Archivo: <strong>{form.acuseName}</strong> (cargado)
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        <div className="flex gap-3">
          <button
            disabled={sending || uploading}
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

/* ========= Pequeños componentes de forma ========= */
function Input({ label, value, onChange, type = "text", min }) {
  return (
    <div>
      <label className="text-sm text-slate-600">{label}</label>
      <input
        type={type}
        min={min}
        className="mt-1 w-full rounded-lg border px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
function Select({ label, value, onChange, options, placeholder }) {
  return (
    <div>
      <label className="text-sm text-slate-600">{label}</label>
      <select
        className="mt-1 w-full rounded-lg border px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder || "Selecciona…"}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
function SelectSimple({ label, value, onChange, options, placeholder }) {
  return (
    <div>
      <label className="text-sm text-slate-600">{label}</label>
      <select
        className="mt-1 w-full rounded-lg border px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((txt) => (
          <option key={txt} value={txt}>
            {txt}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ========= Utilidad ========= */
function readAsDataURL(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onerror = rej;
    reader.onload = () => res(reader.result);
    reader.readAsDataURL(file);
  });
}
