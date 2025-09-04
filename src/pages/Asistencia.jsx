// src/pages/Asistencia.jsx
import { useMemo, useState } from "react";

/* Catálogos */
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
  "Conflicto laboral",
  "Información",
  "Trámite",
  "Facilidades administrativas",
];

const INSTITUCIONES = [
  "Servicios de Salud de Oaxaca",
  "Servicios de Salud IMSS-Bienestar",
];

const TIPOS_EVENTO = [
  "Asamblea",
  "Plenos",
  "Capacitación",
  "Cursos",
  "Reunión",
  "Evento oficial",
  "Otro",
];

/* estilos de inputs con borde rojo si está inválido */
const inputCls = (bad) =>
  "w-full rounded-md border px-3 py-2 outline-none focus:ring-2 " +
  (bad
    ? "border-red-400 ring-red-300 focus:ring-red-300"
    : "border-slate-300 ring-indigo-200 focus:ring-indigo-200");

export default function Asistencia() {
  // Datos de contacto
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [unidadAds, setUnidadAds] = useState("");
  const [curp, setCurp] = useState("");
  const [rfc, setRfc] = useState("");

  // Clasificación
  const [modulo, setModulo] = useState("");
  const [tipo, setTipo] = useState("");

  // Descripción
  const [descripcion, setDescripcion] = useState("");

  // Facilidades
  const [institucion, setInstitucion] = useState(INSTITUCIONES[0]);
  const [cantSolicitantes, setCantSolicitantes] = useState(1);
  const [evento, setEvento] = useState(TIPOS_EVENTO[0]);
  const [periodos, setPeriodos] = useState([]); // [{desde:'yyyy-mm-dd', hasta:'yyyy-mm-dd'}]
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [acuseChecked, setAcuseChecked] = useState(false);
  const [acuseFile, setAcuseFile] = useState(null);
  const [acuseKey, setAcuseKey] = useState(null);

  // UI
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [okFolio, setOkFolio] = useState("");

  const requiereFacilidades = tipo === "Facilidades administrativas";

  /* Validaciones campo a campo para mostrar bordes rojos */
  const invalid = useMemo(() => {
    const errs = {};
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
    if (!nombre) errs.nombre = true;
    if (!emailOk) errs.correo = true;
    if (!modulo) errs.modulo = true;
    if (!tipo) errs.tipo = true;
    if (!descripcion) errs.descripcion = true;

    if (requiereFacilidades) {
      if (!institucion) errs.institucion = true;
      if (!evento) errs.evento = true;
      if (!Array.isArray(periodos) || periodos.length === 0) errs.periodos = true;
      if (!acuseChecked) errs.acuse = true;
    }
    return errs;
  }, [nombre, correo, modulo, tipo, descripcion, requiereFacilidades, institucion, evento, periodos, acuseChecked]);

  const canSubmit = useMemo(() => Object.keys(invalid).length === 0, [invalid]);

  const resetForm = () => {
    setNombre("");
    setCorreo("");
    setTelefono("");
    setUnidadAds("");
    setCurp("");
    setRfc("");
    setModulo("");
    setTipo("");
    setDescripcion("");
    setInstitucion(INSTITUCIONES[0]);
    setCantSolicitantes(1);
    setEvento(TIPOS_EVENTO[0]);
    setPeriodos([]);
    setDesde("");
    setHasta("");
    setAcuseChecked(false);
    setAcuseFile(null);
    setAcuseKey(null);
  };

  /* Sube el acuse a la función serverless y devuelve la llave */
  const subirAcuse = async () => {
    if (!acuseFile) return null;
    const b64 = await fileToB64(acuseFile);
    const res = await fetch("/.netlify/functions/acuse-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: acuseFile.name, fileB64: b64 }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "No se pudo subir el acuse");
    return json.key;
  };

  /* Agrega un periodo. Si no hay 'hasta', se toma como día único */
  const onAddPeriodo = () => {
    if (!desde) return;
    const h = hasta || desde;
    if (new Date(desde) > new Date(h)) return;
    setPeriodos((p) => [...p, { desde, hasta: h }]);
    setDesde("");
    setHasta("");
  };

  /* Submit */
  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setOkFolio("");

    if (!canSubmit) {
      setErrorMsg("Completa los campos obligatorios.");
      return;
    }

    try {
      setSaving(true);

      let adjuntos = [];
      let facilidades = null;

      if (requiereFacilidades) {
        let key = acuseKey;
        if (!key && acuseFile) {
          key = await subirAcuse();
          setAcuseKey(key);
        }
        facilidades = {
          institucion,
          cantidadSolicitantes: Number(cantSolicitantes) || 1,
          tipoEvento: evento,
          periodos,
          confirmacionAcuseRH: acuseChecked,
          acuseKey: key || null,
        };
        if (key) adjuntos.push({ tipo: "acuseRH", key });
      }

      const payload = {
        nombre,
        correo,
        telefono,
        curp,
        rfc,
        unidadAdscripcion: unidadAds,
        modulo,
        tipo,
        descripcion,
        facilidades,
        adjuntos,
        destino: modulo,
      };

      const res = await fetch("/.netlify/functions/tickets-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      setOkFolio(json.folio); // abre modal
      resetForm();
    } catch (err) {
      setErrorMsg(String(err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <header className="bg-gradient-to-b from-red-800 to-red-600 text-white rounded-lg p-6 mb-6 shadow">
        <h1 className="text-3xl font-bold">Mesa de Asistencia</h1>
        <p className="opacity-90">
          ¿Tienes una solicitud o problema? Registra tu ticket y el equipo correspondiente te atenderá.
        </p>
      </header>

      {errorMsg && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {errorMsg}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-8">
        {/* Datos de contacto */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Datos de contacto</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Nombre completo</label>
              <input className={inputCls(invalid.nombre)} value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Correo</label>
              <input className={inputCls(invalid.correo)} value={correo} onChange={(e) => setCorreo(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Teléfono</label>
              <input className={inputCls(false)} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Unidad de adscripción (opcional)</label>
              <input className={inputCls(false)} value={unidadAds} onChange={(e) => setUnidadAds(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">CURP (opcional)</label>
              <input className={inputCls(false)} value={curp} onChange={(e) => setCurp(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">RFC (opcional)</label>
              <input className={inputCls(false)} value={rfc} onChange={(e) => setRfc(e.target.value)} />
            </div>
          </div>
        </section>

        {/* Clasificación */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Clasificación</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Secretaría / Módulo destino</label>
              <select className={inputCls(invalid.modulo)} value={modulo} onChange={(e) => setModulo(e.target.value)}>
                <option value="">Seleccione…</option>
                {SECRETARIAS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Tipo de solicitud</label>
              <select className={inputCls(invalid.tipo)} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="">Seleccione…</option>
                {TIPOS_SOLICITUD.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bloque: Facilidades */}
          {requiereFacilidades && (
            <div className="mt-6 rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-lg mb-3">Facilidades administrativas</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Institución</label>
                  <select
                    className={inputCls(invalid.institucion)}
                    value={institucion}
                    onChange={(e) => setInstitucion(e.target.value)}
                  >
                    {INSTITUCIONES.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Cantidad de solicitantes</label>
                  <input
                    type="number"
                    min={1}
                    className={inputCls(false)}
                    value={cantSolicitantes}
                    onChange={(e) => setCantSolicitantes(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Tipo de evento/incidencia</label>
                  <select className={inputCls(invalid.evento)} value={evento} onChange={(e) => setEvento(e.target.value)}>
                    {TIPOS_EVENTO.map((e1) => (
                      <option key={e1} value={e1}>
                        {e1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fechas o periodos */}
              <div className="mt-4">
                <label className="block text-sm mb-2">Fechas o periodos</label>
                <div className="flex gap-2 max-w-xl">
                  <input type="date" className={inputCls(false)} value={desde} onChange={(e) => setDesde(e.target.value)} />
                  <span className="self-center">→</span>
                  <input type="date" className={inputCls(false)} value={hasta} onChange={(e) => setHasta(e.target.value)} />
                  <button type="button" className="px-3 rounded-md bg-slate-900 text-white" onClick={onAddPeriodo}>
                    Agregar periodo
                  </button>
                </div>
                {invalid.periodos && <p className="text-red-600 text-sm mt-1">Agrega al menos un periodo válido.</p>}
                {periodos.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                    {periodos.map((p, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span>
                          {p.desde} → {p.hasta}
                        </span>
                        <button
                          type="button"
                          className="text-red-600"
                          onClick={() => setPeriodos(periodos.filter((_, j) => j !== i))}
                        >
                          quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Acuse de RH */}
              <div className="mt-4 space-y-2">
                <div>
                  <label className="block text-sm mb-1">Acuse entregado a RH (PDF/imagen, máx. ~4 MB)</label>
                  <input
                    type="file"
                    className={inputCls(false)}
                    accept=".pdf,image/*"
                    onChange={(e) => setAcuseFile(e.target.files?.[0] || null)}
                  />
                  {acuseFile && <p className="text-sm text-slate-600 mt-1 truncate">{acuseFile.name}</p>}
                </div>

                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={acuseChecked}
                    onChange={(e) => setAcuseChecked(e.target.checked)}
                  />
                  <span className={invalid.acuse ? "text-red-600" : ""}>
                    Confirmo que ya entregué el acuse a RH.
                  </span>
                </label>
              </div>
            </div>
          )}
        </section>

        {/* Descripción */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Descripción</h2>
          <textarea
            rows={4}
            className={inputCls(invalid.descripcion)}
            placeholder="Describe brevemente tu solicitud o problema…"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </section>

        <div className="pt-2">
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className={`px-5 py-2 rounded-md text-white ${
              !canSubmit || saving ? "bg-slate-400" : "bg-red-700 hover:bg-red-800"
            }`}
          >
            {saving ? "Enviando…" : "Registrar ticket"}
          </button>
        </div>
      </form>

      {/* Modal de éxito */}
      {okFolio && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[999]">
          <div className="bg-white rounded-xl p-6 shadow-xl w-[90%] max-w-md">
            <h3 className="text-xl font-bold mb-2">¡Ticket registrado!</h3>
            <p className="mb-4">
              Tu folio es <span className="font-mono font-semibold">{okFolio}</span>.
            </p>
            <button className="px-4 py-2 rounded-md bg-red-700 text-white" onClick={() => setOkFolio("")}>
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* helpers */
function fileToB64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      const comma = s.indexOf(",");
      resolve(comma >= 0 ? s.slice(comma + 1) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
