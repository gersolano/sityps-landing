import { useMemo, useState } from "react";

// Catálogo de Secretarías/Comisiones
const SECRETARIAS = [
  "Secretaría General",
  "Secretaria de Organización, actas y acuerdos",
  "Secretaria de Asuntos Laborales",
  "Secretaría de Formación, Capacitación y Desarrollo Profesional",
  "Secretaría de Seguridad y Previsión Social",
  "Secretaría de Escalafón y Promoción de Plazas",
  "Secretaría de Créditos, vivienda y prestaciones económicas",
  "Secretaría de Relaciones Prensa y propaganda",
  "Secretaría de Finanzas",
  "Secretaría de Fomento Cultural y Deportivo",
  "Secretaría de la Mujer y Equidad de Género",
  "Comisión de Honor y Justicia",
  "Comité Electoral",
  "Comisión Juridica",
];

const TIPOS_SOLICITUD = [
  "Facilidades administrativas",
  "Conflicto laboral",
  "Consulta general",
  "Solicitud de documento",
  "Otro",
];

const INSTITUCIONES = [
  "Servicios de Salud de Oaxaca",
  "Servicios de Salud IMSS-Bienestar",
];

const TIPOS_EVENTO = [
  "Asamblea",
  "Plenos",
  "Cursos",
  "Capacitación",
  "Comisión",
  "Reunión",
  "Otro",
];

const emailOk = (s) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || "").trim());

const phoneOk = (s) =>
  /^[0-9\s+\-()]{7,20}$/.test((s || "").trim());

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function Asistencia() {
  // Datos base
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [unidad, setUnidad] = useState("");
  const [curp, setCurp] = useState("");
  const [rfc, setRfc] = useState("");

  // Clasificación
  const [secretaria, setSecretaria] = useState("");
  const [tipoSolicitud, setTipoSolicitud] = useState("");

  // Descripción general
  const [descripcion, setDescripcion] = useState("");

  // Adjuntos generales (todas las solicitudes)
  const [adjuntos, setAdjuntos] = useState([]); // File[]

  // Facilidades administrativas
  const [inst, setInst] = useState(INSTITUCIONES[0]);
  const [tipoEvento, setTipoEvento] = useState(TIPOS_EVENTO[0]);
  const [cantidadSolicitantes, setCantidadSolicitantes] = useState(1);
  const [diasSolicitados, setDiasSolicitados] = useState(""); // number | ""
  const [fechaUnica, setFechaUnica] = useState(""); // YYYY-MM-DD
  const [rangos, setRangos] = useState([]); // [{desde, hasta}]
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [acuse, setAcuse] = useState(null); // File
  const [confirmAcuse, setConfirmAcuse] = useState(false);

  // UI estado
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [okFolio, setOkFolio] = useState("");

  const esFacilidades = useMemo(
    () => tipoSolicitud === "Facilidades administrativas",
    [tipoSolicitud]
  );

  const addRango = () => {
    const e = {};
    if (!desde) e.desde = true;
    if (!hasta) e.hasta = true;
    if (Object.keys(e).length) {
      setErrores((p) => ({ ...p, ...e }));
      return;
    }
    if (hasta < desde) {
      setErrores((p) => ({
        ...p,
        rango: "La fecha fin no puede ser menor que la inicio.",
      }));
      return;
    }
    setRangos((arr) => [...arr, { desde, hasta }]);
    setDesde("");
    setHasta("");
    setErrores((p) => {
      const { rango, desde: _d, hasta: _h, ...rest } = p;
      return rest;
    });
  };

  const quitarRango = (idx) =>
    setRangos((arr) => arr.filter((_, i) => i !== idx));

  const validar = () => {
    const e = {};

    // Requeridos base
    if (!nombre.trim()) e.nombre = true;
    if (!emailOk(correo)) e.correo = true;
    if (!phoneOk(telefono)) e.telefono = true;
    if (!secretaria) e.secretaria = true;
    if (!tipoSolicitud) e.tipoSolicitud = true;
    if (!descripcion.trim()) e.descripcion = true;

    // Facilidades
    if (esFacilidades) {
      const dias = Number(diasSolicitados);
      if (!dias || dias < 1) e.diasSolicitados = true;

      if (dias === 1) {
        if (!fechaUnica) e.fechaUnica = true;
      } else if (dias > 1) {
        if (rangos.length === 0) e.rangos = true;
      }

      // Archivo de acuse & confirmación
      if (!acuse) e.acuse = true;
      if (!confirmAcuse) e.confirmAcuse = true;
    }

    return e;
  };

  const reset = () => {
    setNombre("");
    setCorreo("");
    setTelefono("");
    setUnidad("");
    setCurp("");
    setRfc("");
    setSecretaria("");
    setTipoSolicitud("");
    setDescripcion("");
    setAdjuntos([]);
    // facilidades
    setInst(INSTITUCIONES[0]);
    setTipoEvento(TIPOS_EVENTO[0]);
    setCantidadSolicitantes(1);
    setDiasSolicitados("");
    setFechaUnica("");
    setRangos([]);
    setDesde("");
    setHasta("");
    setAcuse(null);
    setConfirmAcuse(false);
    setErrores({});
  };

  const subirArchivo = async (file, path) => {
    const fd = new FormData();
    fd.append("file", file);
    // path ejemplo: tickets/T-ABC/adjuntos/  (el server añade filename)
    const res = await fetch(
      `/.netlify/functions/acuse-upload?path=${encodeURIComponent(path)}&filename=${encodeURIComponent(file.name)}`,
      { method: "POST", body: fd }
    );
    if (!res.ok) throw new Error("No se pudo subir archivo");
    return res.json(); // {url}
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const eMap = validar();
    setErrores(eMap);
    if (Object.keys(eMap).length) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setEnviando(true);
    try {
      // Prepara payload
      const payload = {
        nombre: nombre.trim(),
        correo: correo.trim(),
        telefono: telefono.trim(),
        unidad: unidad.trim(),
        curp: curp.trim(),
        rfc: rfc.trim(),
        secretaria,
        tipoSolicitud,
        descripcion: descripcion.trim(),
        adjuntosMeta: (adjuntos || []).map((f) => ({
          name: f.name,
          type: f.type,
          size: f.size,
        })),
        facilidades: esFacilidades
          ? {
              institucion: inst,
              tipoEvento,
              cantidadSolicitantes: Number(cantidadSolicitantes) || 1,
              diasSolicitados: Number(diasSolicitados) || 0,
              fechaUnica: fechaUnica || null,
              rangos: rangos,
              acuseNombre: acuse?.name || null,
            }
          : null,
      };

      // 1) Crear ticket
      const r = await fetch("/.netlify/functions/tickets-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok || !data?.folio) {
        throw new Error(data?.error || "No se pudo guardar el ticket");
      }
      const folio = data.folio;

      // 2) Subir acuse (si aplica)
      if (esFacilidades && acuse) {
        try {
          await subirArchivo(acuse, `tickets/${folio}/acuse/`);
        } catch {
          // no romper el flujo si falla el archivo
        }
      }

      // 3) Subir adjuntos generales (si hay)
      if (adjuntos?.length) {
        for (const f of adjuntos) {
          try {
            await subirArchivo(f, `tickets/${folio}/adjuntos/`);
          } catch {
            // ignorar error puntual
          }
        }
      }

      setOkFolio(folio);
    } catch (err) {
      console.error(err);
      setErrores({ submit: err.message || "No se pudo guardar el ticket" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setEnviando(false);
    }
  };

  // Clases helper
  const cx = (...a) => a.filter(Boolean).join(" ");
  const err = (k) =>
    errores[k]
      ? "ring-2 ring-red-500 focus:ring-red-500"
      : "focus:ring-sky-500";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Banner errores/ok */}
      {errores.submit && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-800 px-4 py-3">
          {errores.submit}
        </div>
      )}

      {okFolio && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold mb-2">
              ¡Ticket registrado!
            </h3>
            <p className="text-slate-700">
              Tu folio es <span className="font-mono font-bold">{okFolio}</span>.
            </p>
            <div className="mt-6 text-right">
              <button
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                onClick={() => {
                  setOkFolio("");
                  reset();
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="mb-6">
        <h1 className="text-3xl font-bold">Mesa de Asistencia</h1>
        <p className="text-slate-600">
          ¿Tienes una solicitud o problema? Registra tu ticket y el equipo correspondiente te atenderá.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-8">
        {/* Datos de contacto */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Datos de contacto</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre completo</label>
              <input
                className={cx(
                  "w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring",
                  err("nombre")
                )}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Correo</label>
              <input
                className={cx(
                  "w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring",
                  err("correo")
                )}
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                inputMode="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input
                className={cx(
                  "w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring",
                  err("telefono")
                )}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                inputMode="tel"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unidad de adscripción (opcional)</label>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring focus:ring-sky-500"
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CURP (opcional)</label>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring focus:ring-sky-500"
                value={curp}
                onChange={(e) => setCurp(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">RFC (opcional)</label>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring focus:ring-sky-500"
                value={rfc}
                onChange={(e) => setRfc(e.target.value.toUpperCase())}
              />
            </div>
          </div>
        </section>

        {/* Clasificación */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Clasificación</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Secretaría / Módulo destino</label>
              <select
                className={cx(
                  "w-full rounded-md border border-slate-300 px-3 py-2 outline-none bg-white focus:ring",
                  err("secretaria")
                )}
                value={secretaria}
                onChange={(e) => setSecretaria(e.target.value)}
              >
                <option value="">Seleccione…</option>
                {SECRETARIAS.map((s) => (
                  <option value={s} key={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tipo de solicitud</label>
              <select
                className={cx(
                  "w-full rounded-md border border-slate-300 px-3 py-2 outline-none bg-white focus:ring",
                  err("tipoSolicitud")
                )}
                value={tipoSolicitud}
                onChange={(e) => setTipoSolicitud(e.target.value)}
              >
                <option value="">Seleccione…</option>
                {TIPOS_SOLICITUD.map((t) => (
                  <option value={t} key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Facilidades administrativas */}
          {esFacilidades && (
            <div className="mt-6 border rounded-lg bg-white/70 p-4 space-y-4">
              <h3 className="font-semibold text-slate-800">Facilidades administrativas</h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Institución</label>
                  <select
                    className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none bg-white focus:ring focus:ring-sky-500"
                    value={inst}
                    onChange={(e) => setInst(e.target.value)}
                  >
                    {INSTITUCIONES.map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Cantidad de solicitantes</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring focus:ring-sky-500"
                    value={cantidadSolicitantes}
                    onChange={(e) => setCantidadSolicitantes(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de evento/incidencia</label>
                  <select
                    className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none bg-white focus:ring focus:ring-sky-500"
                    value={tipoEvento}
                    onChange={(e) => setTipoEvento(e.target.value)}
                  >
                    {TIPOS_EVENTO.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Número de días solicitados
                  </label>
                  <input
                    type="number"
                    min={1}
                    className={cx(
                      "w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring",
                      err("diasSolicitados")
                    )}
                    value={diasSolicitados}
                    onChange={(e) => setDiasSolicitados(e.target.value)}
                  />
                </div>
              </div>

              {/* Fechas / Periodos */}
              {(Number(diasSolicitados) || 0) === 1 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha solicitada</label>
                    <input
                      type="date"
                      min={todayISO()}
                      className={cx(
                        "w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring",
                        err("fechaUnica")
                      )}
                      value={fechaUnica}
                      onChange={(e) => setFechaUnica(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid md:grid-cols-[1fr,1fr,auto] gap-3 items-end">
                    <div>
                      <label className="block text-sm font-medium mb-1">Fecha inicio</label>
                      <input
                        type="date"
                        min={todayISO()}
                        className={cx(
                          "w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring",
                          errores.desde ? "ring-2 ring-red-500" : "focus:ring-sky-500"
                        )}
                        value={desde}
                        onChange={(e) => setDesde(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Fecha fin</label>
                      <input
                        type="date"
                        min={desde || todayISO()}
                        className={cx(
                          "w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring",
                          errores.hasta ? "ring-2 ring-red-500" : "focus:ring-sky-500"
                        )}
                        value={hasta}
                        onChange={(e) => setHasta(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addRango}
                      className="px-4 h-[42px] rounded-md bg-slate-900 text-white hover:bg-slate-800"
                    >
                      Agregar
                    </button>
                  </div>

                  {errores.rangos && (
                    <p className="text-red-600 text-sm">Agrega al menos un periodo.</p>
                  )}
                  {errores.rango && (
                    <p className="text-red-600 text-sm">{errores.rango}</p>
                  )}

                  {rangos.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {rangos.map((r, i) => (
                        <li key={`${r.desde}-${r.hasta}-${i}`} className="text-sm flex items-center gap-3">
                          <span className="font-mono">{r.desde}</span>
                          <span>→</span>
                          <span className="font-mono">{r.hasta}</span>
                          <button
                            type="button"
                            className="text-red-600 hover:underline"
                            onClick={() => quitarRango(i)}
                          >
                            quitar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {/* Acuse RH */}
              <div className="grid md:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Acuse entregado a RH (PDF/imagen, máx. 4MB)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => setAcuse(e.target.files?.[0] || null)}
                    className={cx(
                      "block w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-md file:border-0 file:bg-slate-900 file:text-white hover:file:bg-slate-800",
                      err("acuse")
                    )}
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className={cx(
                      "w-4 h-4 rounded border-slate-300",
                      err("confirmAcuse")
                    )}
                    checked={confirmAcuse}
                    onChange={(e) => setConfirmAcuse(e.target.checked)}
                  />
                  <span>Confirmo que ya entregué el acuse a RH.</span>
                </label>
              </div>
            </div>
          )}
        </section>

        {/* Descripción */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Descripción</h2>
          <textarea
            rows={5}
            placeholder="Describe brevemente tu solicitud o problema…"
            className={cx(
              "w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring",
              err("descripcion")
            )}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </section>

        {/* Adjuntos generales (todas las solicitudes) */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Adjuntar archivos</h2>
          <input
            type="file"
            multiple
            accept="application/pdf,image/*"
            onChange={(e) => setAdjuntos(Array.from(e.target.files || []))}
            className="block w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-md file:border-0 file:bg-sky-700 file:text-white hover:file:bg-sky-800"
          />
          {adjuntos?.length > 0 && (
            <p className="text-sm text-slate-600 mt-2">
              {adjuntos.length} archivo(s) seleccionados.
            </p>
          )}
        </section>

        <div className="pt-2">
          <button
            type="submit"
            disabled={enviando}
            className={cx(
              "px-5 py-2 rounded-md text-white",
              enviando
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700"
            )}
          >
            {enviando ? "Guardando…" : "Registrar ticket"}
          </button>
        </div>
      </form>
    </div>
  );
}
