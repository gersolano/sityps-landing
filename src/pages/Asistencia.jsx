import { useMemo, useState } from "react";

/* =========================
   Catálogos
========================= */

// Secretarías / módulos destino (según lista enviada)
const SECRETARIAS = [
  { value: "general",            label: "Secretaría General" },
  { value: "organizacion",       label: "Secretaria de Organización, actas y acuerdos" },
  { value: "laboral",            label: "Secretaria de Asuntos Laborales" },
  { value: "formacion",          label: "Secretaría de Formación, Capacitación y Desarrollo Profesional" },
  { value: "seguridad",          label: "Secretaría de Seguridad y Previsión Social" },
  { value: "escalafon",          label: "Secretaría de Escalafón y Promoción de Plazas" },
  { value: "creditos",           label: "Secretaría de Créditos, vivienda y prestaciones económicas" },
  { value: "prensa",             label: "Secretaría de Relaciones Prensa y propaganda" },
  { value: "finanzas",           label: "Secretaría de Finanzas" },
  { value: "cultura",            label: "Secretaría de Fomento Cultural y Deportivo" },
  { value: "mujer",              label: "Secretaría de la Mujer y Equidad de Género" },
  { value: "comision-hj",        label: "Comisión de Honor y Justicia" },
  { value: "comite-electoral",   label: "Comité Electoral" },
  { value: "comision-juridica",  label: "Comisión Juridica" },
];

const TIPOS = [
  { value: "facilidades",       label: "Facilidades administrativas" },
  { value: "conflicto-laboral", label: "Conflicto laboral" },
  { value: "documento",         label: "Emisión de documento" },
  { value: "consulta",          label: "Consulta / información" },
  { value: "otro",              label: "Otro" },
];

const INSTITUCIONES = [
  "Servicios de Salud de Oaxaca",
  "Servicios de Salud IMSS-Bienestar",
];

const EVENTOS_FACILIDADES = [
  "Asamblea",
  "Plenos",
  "Cursos",
  "Capacitación",
  "Comisión sindical",
  "Evento académico",
  "Acto cívico",
  "Otro",
];

/* =========================
   Componente
========================= */

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
    acuseKey: "",
    facilidades: {
      institucion: INSTITUCIONES[0],
      cantidadSolicitantes: 1,
      tipoEvento: "",
      otroTipoEvento: "",
      fechas: [], // [{from:'YYYY-MM-DD', to?: 'YYYY-MM-DD'}]
    },
  });

  const [tempFecha, setTempFecha] = useState({ from: "", to: "" });
  const [confirmoAcuse, setConfirmoAcuse] = useState(false);

  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [errMsg, setErrMsg] = useState("");
  const [successFolio, setSuccessFolio] = useState(""); // para el modal

  // Campos limpios
  const nombre = useMemo(() => form.nombre.trim(), [form.nombre]);
  const correo = useMemo(() => form.correo.trim(), [form.correo]);
  const modulo = useMemo(() => form.moduloDestino.trim(), [form.moduloDestino]);
  const tipo   = useMemo(() => form.tipo.trim(), [form.tipo]);
  const desc   = useMemo(() => form.descripcion.trim(), [form.descripcion]);

  const faltanBasicos = !nombre || !correo || !modulo || !tipo || !desc;

  const faltanFacilidades =
    tipo === "facilidades" && (
      form.facilidades.fechas.length === 0 ||
      !form.facilidades.tipoEvento ||
      (form.facilidades.tipoEvento === "Otro" && !form.facilidades.otroTipoEvento.trim()) ||
      (!form.acuseKey && !confirmoAcuse)
    );

  const disabledSubmit = sending || uploading || faltanBasicos || (tipo === "facilidades" && faltanFacilidades);

  function update(path, value) {
    setForm((f) => {
      const copy = structuredClone(f);
      const segs = path.split(".");
      let cur = copy;
      for (let i = 0; i < segs.length - 1; i++) cur = cur[segs[i]];
      cur[segs.at(-1)] = value;
      return copy;
    });
  }

  /* ---------- UX helpers ---------- */
  const baseInput = "w-full rounded-lg focus:ring-1";
  const okBorder  = "border border-slate-300 focus:border-red-500 focus:ring-red-500";
  const badBorder = "border border-red-500 focus:border-red-600 focus:ring-red-500";

  const missNombre = submitted && !nombre;
  const missCorreo = submitted && !correo;
  const missModulo = submitted && !modulo;
  const missTipo   = submitted && !tipo;
  const missDesc   = submitted && !desc;

  const missFacTipoEvento = submitted && tipo === "facilidades" && !form.facilidades.tipoEvento;
  const missFacOtroEvento = submitted && tipo === "facilidades" &&
    form.facilidades.tipoEvento === "Otro" && !form.facilidades.otroTipoEvento.trim();
  const missFacFechas     = submitted && tipo === "facilidades" && form.facilidades.fechas.length === 0;
  const missFacAcuse      = submitted && tipo === "facilidades" && !form.acuseKey && !confirmoAcuse;

  /* ---------- Acciones ---------- */

  async function onUploadAcuse(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrMsg("");
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/.netlify/functions/acuse-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, mime: file.type, base64 }),
      });
      const js = await res.json();
      if (res.ok && js.ok) {
        update("acuseKey", js.key);
      } else {
        setErrMsg(js.error || "No se pudo subir el archivo.");
      }
    } catch {
      setErrMsg("Error al subir el archivo.");
    } finally {
      setUploading(false);
    }
  }

  function addPeriodo() {
    const from = (tempFecha.from || "").trim();
    const to   = (tempFecha.to || "").trim();
    if (!from) {
      setSubmitted(true);
      return;
    }
    update("facilidades.fechas", [...form.facilidades.fechas, { from, to: to || undefined }]);
    setTempFecha({ from: "", to: "" });
  }

  function removePeriodo(idx) {
    const arr = [...form.facilidades.fechas];
    arr.splice(idx, 1);
    update("facilidades.fechas", arr);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setErrMsg("");
    setSuccessFolio("");

    if (disabledSubmit) return;

    setSending(true);
    try {
      const body = {
        nombre,
        correo,
        telefono: form.telefono,
        unidadAdscripcion: form.unidadAdscripcion,
        curp: form.curp ? form.curp.toUpperCase() : "",
        rfc: form.rfc ? form.rfc.toUpperCase() : "",
        moduloDestino: modulo,
        tipo,
        descripcion: desc,
        acuseKey: form.acuseKey || "",
      };

      if (tipo === "facilidades") {
        body.facilidades = {
          institucion: form.facilidades.institucion,
          cantidadSolicitantes: Number(form.facilidades.cantidadSolicitantes || 1),
          tipoEvento:
            form.facilidades.tipoEvento === "Otro" && form.facilidades.otroTipoEvento
              ? form.facilidades.otroTipoEvento
              : form.facilidades.tipoEvento,
          fechasSolicitadas: form.facilidades.fechas
            .map((p) => (p.to ? `${p.from} → ${p.to}` : p.from))
            .join(", "),
        };
      }

      const res = await fetch("/.netlify/functions/tickets-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const js = await res.json();
      if (res.ok && js.ok) {
        setSuccessFolio(js.ticket.folio);
        // reset
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
          acuseKey: "",
          facilidades: {
            institucion: INSTITUCIONES[0],
            cantidadSolicitantes: 1,
            tipoEvento: "",
            otroTipoEvento: "",
            fechas: [],
          },
        });
        setConfirmoAcuse(false);
        setTempFecha({ from: "", to: "" });
        setSubmitted(false);
      } else {
        setErrMsg(js.error || "No se pudo registrar el ticket.");
      }
    } catch {
      setErrMsg("No se pudo registrar el ticket.");
    } finally {
      setSending(false);
    }
  }

  /* ---------- UI ---------- */

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-b from-red-800 to-red-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Mesa de Asistencia</h1>
          <p className="mt-1 text-white/90">
            ¿Tienes una solicitud o problema? Registra tu ticket y el equipo correspondiente te atenderá.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {errMsg && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {errMsg}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-8">
          {/* Datos de contacto */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800">Datos de contacto</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Nombre completo</label>
                <input
                  className={`${baseInput} ${missNombre ? badBorder : okBorder}`}
                  value={form.nombre}
                  onChange={(e) => update("nombre", e.target.value)}
                  aria-invalid={!!missNombre}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Correo</label>
                <input
                  type="email"
                  className={`${baseInput} ${missCorreo ? badBorder : okBorder}`}
                  value={form.correo}
                  onChange={(e) => update("correo", e.target.value)}
                  aria-invalid={!!missCorreo}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Teléfono</label>
                <input
                  className={`${baseInput} ${okBorder}`}
                  value={form.telefono}
                  onChange={(e) => update("telefono", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Unidad de adscripción (opcional)</label>
                <input
                  className={`${baseInput} ${okBorder}`}
                  value={form.unidadAdscripcion}
                  onChange={(e) => update("unidadAdscripcion", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">CURP (opcional)</label>
                <input
                  className={`${baseInput} border border-slate-300 uppercase tracking-wider focus:border-red-500 focus:ring-red-500`}
                  value={form.curp}
                  onChange={(e) => update("curp", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">RFC (opcional)</label>
                <input
                  className={`${baseInput} border border-slate-300 uppercase tracking-wider focus:border-red-500 focus:ring-red-500`}
                  value={form.rfc}
                  onChange={(e) => update("rfc", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Clasificación */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800">Clasificación</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Secretaría / Módulo destino</label>
                <select
                  className={`${baseInput} ${missModulo ? badBorder : okBorder}`}
                  value={form.moduloDestino}
                  onChange={(e) => update("moduloDestino", e.target.value)}
                  aria-invalid={!!missModulo}
                >
                  <option value="">Seleccione…</option>
                  {SECRETARIAS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Tipo de solicitud</label>
                <select
                  className={`${baseInput} ${missTipo ? badBorder : okBorder}`}
                  value={form.tipo}
                  onChange={(e) => update("tipo", e.target.value)}
                  aria-invalid={!!missTipo}
                >
                  <option value="">Seleccione…</option>
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Facilidades */}
            {form.tipo === "facilidades" && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="font-semibold text-slate-800 mb-3">Facilidades administrativas</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Institución</label>
                    <select
                      className={`${baseInput} ${okBorder}`}
                      value={form.facilidades.institucion}
                      onChange={(e) => update("facilidades.institucion", e.target.value)}
                    >
                      {INSTITUCIONES.map((i) => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Cantidad de solicitantes</label>
                    <input
                      type="number"
                      min={1}
                      className={`${baseInput} ${okBorder}`}
                      value={form.facilidades.cantidadSolicitantes}
                      onChange={(e) => update("facilidades.cantidadSolicitantes", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Tipo de evento/incidencia</label>
                    <select
                      className={`${baseInput} ${missFacTipoEvento ? badBorder : okBorder}`}
                      value={form.facilidades.tipoEvento}
                      onChange={(e) => update("facilidades.tipoEvento", e.target.value)}
                      aria-invalid={!!missFacTipoEvento}
                    >
                      <option value="">Seleccione…</option>
                      {EVENTOS_FACILIDADES.map((e) => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                    {form.facilidades.tipoEvento === "Otro" && (
                      <input
                        placeholder="Especifique…"
                        className={`${baseInput} ${missFacOtroEvento ? badBorder : okBorder} mt-2`}
                        value={form.facilidades.otroTipoEvento}
                        onChange={(e) => update("facilidades.otroTipoEvento", e.target.value)}
                        aria-invalid={!!missFacOtroEvento}
                      />
                    )}
                  </div>

                  {/* Fechas / periodos */}
                  <div className="md:col-span-2">
                    <label className="block text-sm text-slate-600 mb-1">Fechas o periodos</label>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                      <div className="flex gap-2">
                        <input
                          type="date"
                          className={`${baseInput} ${okBorder}`}
                          value={tempFecha.from}
                          onChange={(e) => setTempFecha((t) => ({ ...t, from: e.target.value }))}
                        />
                        <span className="self-center text-slate-500">→</span>
                        <input
                          type="date"
                          className={`${baseInput} ${okBorder}`}
                          value={tempFecha.to}
                          onChange={(e) => setTempFecha((t) => ({ ...t, to: e.target.value }))}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addPeriodo}
                        className="mt-2 md:mt-0 rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-900"
                      >
                        Agregar periodo
                      </button>
                    </div>

                    {missFacFechas && (
                      <p className="mt-2 text-sm text-red-600">Agrega al menos una fecha o periodo.</p>
                    )}

                    {form.facilidades.fechas.length > 0 && (
                      <ul className="mt-3 list-inside list-disc text-sm text-slate-700">
                        {form.facilidades.fechas.map((p, idx) => (
                          <li key={idx} className="flex items-center gap-3">
                            <span>{p.to ? `${p.from} → ${p.to}` : p.from}</span>
                            <button
                              type="button"
                              className="text-red-600 hover:underline"
                              onClick={() => removePeriodo(idx)}
                            >
                              quitar
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Acuse */}
                  <div className="md:col-span-2">
                    <label className="block text-sm text-slate-600 mb-1">Acuse entregado a RH (PDF/imagen, máx. 4MB)</label>
                    <div className="flex items-center gap-3">
                      <input type="file" accept="application/pdf,image/*" onChange={onUploadAcuse} />
                      {uploading && <span className="text-slate-500 text-sm">Subiendo…</span>}
                      {form.acuseKey && (
                        <span className="text-green-700 text-sm">Acuse subido ✓</span>
                      )}
                    </div>

                    {!form.acuseKey && (
                      <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={confirmoAcuse}
                          onChange={(e) => setConfirmoAcuse(e.target.checked)}
                        />
                        Confirmo que ya entregué el acuse a RH.
                      </label>
                    )}
                    {missFacAcuse && (
                      <p className="text-sm text-red-600 mt-1">
                        Debes adjuntar el acuse o confirmar que ya fue entregado a RH.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Descripción */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800">Descripción</h2>
            <textarea
              rows={5}
              className={`${baseInput} ${missDesc ? badBorder : okBorder} mt-2`}
              placeholder="Describe brevemente tu solicitud o problema…"
              value={form.descripcion}
              onChange={(e) => update("descripcion", e.target.value)}
              aria-invalid={!!missDesc}
            />
          </section>

          {/* Enviar */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={disabledSubmit}
              className="rounded-lg bg-red-700 text-white px-6 py-2.5 hover:bg-red-800 disabled:opacity-60"
            >
              {sending ? "Enviando…" : "Registrar ticket"}
            </button>
            {disabledSubmit && submitted && (
              <span className="text-sm text-slate-500">
                Revisa los campos marcados en rojo.
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Modal de confirmación */}
      {successFolio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[92%] max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold text-slate-800">¡Ticket registrado!</h3>
            <p className="mt-2 text-slate-700">
              Tu ticket fue registrado correctamente. Folio:
              <span className="ml-1 font-mono font-semibold text-slate-900">{successFolio}</span>
            </p>
            <div className="mt-6 flex justify-end">
              <button
                className="rounded-lg bg-red-700 px-5 py-2 text-white hover:bg-red-800"
                onClick={() => setSuccessFolio("")}
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

/* =========================
   Utils
========================= */
function fileToBase64(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}
