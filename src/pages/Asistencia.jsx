// src/pages/Asistencia.jsx
import { useEffect, useMemo, useRef, useState } from "react";

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

const INSTITUCIONES = [
  "Servicios de Salud de Oaxaca",
  "Servicios de Salud IMSS-Bienestar",
];

const EVENTOS = [
  "Asamblea",
  "Plenos",
  "Cursos",
  "Capacitación",
  "Comisión",
  "Gestión sindical",
  "Reunión con autoridad",
  "Movilización",
  "Otro",
];

const TIPO_SOLICITUD = [
  "Facilidades administrativas",
  "Afiliación",
  "Conflicto laboral",
  "Consulta general",
  "Otro",
];

// Helpers UI
const cx = (...k) => k.filter(Boolean).join(" ");
const baseInput =
  "w-full rounded-md border bg-white px-3 py-2 outline-none border-slate-300 focus:ring-2 focus:ring-red-300";
const errInput = "border-red-500 ring-1 ring-red-400 focus:ring-red-400";
const errStyle = (on) => (on ? { borderColor: "#ef4444", boxShadow: "0 0 0 1px #fca5a5 inset" } : undefined);

// LocalStorage
const PROFILE_KEY = "asistencia_profile_v1";

export default function Asistencia() {
  const [alert, setAlert] = useState(null); // {type:'ok'|'error', msg}
  const [folioOK, setFolioOK] = useState("");

  // contacto
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [unidad, setUnidad] = useState("");
  const [curp, setCurp] = useState("");
  const [rfc, setRfc] = useState("");

  // clasificación
  const [modulo, setModulo] = useState("");
  const [tipo, setTipo] = useState("");

  // facilidades
  const [inst, setInst] = useState(INSTITUCIONES[0]);
  const [evento, setEvento] = useState("Capacitación");
  const [cantSolic, setCantSolic] = useState("1");
  const [dias, setDias] = useState("1");
  const [fecha, setFecha] = useState("");
  const [fini, setFini] = useState("");
  const [ffin, setFfin] = useState("");

  // acuse RH (opcional recomendado)
  const [acuseKey, setAcuseKey] = useState("");
  const [acuseName, setAcuseName] = useState("");
  const [acuseUploading, setAcuseUploading] = useState(false);
  const [acuseConfirm, setAcuseConfirm] = useState(false);

  // adjuntos globales
  const [adjuntos, setAdjuntos] = useState([]);
  const [adjuntosInfo, setAdjuntosInfo] = useState([]); // {name,size}

  // descripción
  const [descripcion, setDescripcion] = useState("");

  // errores
  const [errs, setErrs] = useState({});
  const refs = useRef({});

  const isFacilidades = useMemo(
    () => tipo === "Facilidades administrativas",
    [tipo]
  );
  const diasNum = useMemo(() => Number(dias || 0), [dias]);

  // Cargar perfil
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        setNombre(p.nombre || "");
        setCorreo(p.correo || "");
        setTelefono(p.telefono || "");
        setUnidad(p.unidad || "");
        setCurp(p.curp || "");
        setRfc(p.rfc || "");
      }
    } catch {}
  }, []);

  // Guardar perfil (datos de contacto) al vuelo
  useEffect(() => {
    const p = { nombre, correo, telefono, unidad, curp, rfc };
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch {}
  }, [nombre, correo, telefono, unidad, curp, rfc]);

  async function onAcuseChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setAlert({ type: "error", msg: "El acuse debe pesar máximo 4 MB." });
      return;
    }
    setAcuseUploading(true);
    setAlert(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/.netlify/functions/acuse-upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo subir el acuse.");

      setAcuseKey(data.key || "");
      setAcuseName(file.name);
      setAlert({ type: "ok", msg: "Acuse subido correctamente." });
    } catch (err) {
      setAcuseKey("");
      setAcuseName("");
      setAlert({ type: "error", msg: String(err.message || err) });
    } finally {
      setAcuseUploading(false);
    }
  }

  function onAdjuntosChange(e) {
    const files = Array.from(e.target.files || []);
    setAdjuntos(files);
    setAdjuntosInfo(files.map((f) => ({ name: f.name, size: f.size })));
  }

  // Validación
  function validate() {
    const next = {};
    const req = (v) => v && String(v).trim().length > 0;

    if (!req(nombre)) next.nombre = "Indica tu nombre.";
    if (!req(correo)) next.correo = "Indica tu correo.";
    if (!req(modulo)) next.modulo = "Selecciona la secretaría destino.";
    if (!req(tipo)) next.tipo = "Selecciona el tipo de solicitud.";
    if (!req(descripcion)) next.descripcion = "Describe brevemente tu solicitud.";

    if (isFacilidades) {
      if (!req(inst)) next.inst = "Selecciona la institución.";
      if (!req(evento)) next.evento = "Selecciona el tipo de evento.";
      if (!diasNum || diasNum < 1) next.dias = "Indica el número de días solicitados.";
      if (diasNum === 1) {
        if (!req(fecha)) next.fecha = "Indica la fecha solicitada.";
      } else {
        if (!req(fini)) next.fini = "Fecha inicial requerida.";
        if (!req(ffin)) next.ffin = "Fecha final requerida.";
      }
      if (!acuseConfirm) next.acuseConfirm = "Debes confirmar que entregaste el acuse a RH.";
      // Si quieres forzar archivo:
      // if (!acuseKey) next.acuseConfirm = "Adjunta el acuse de RH.";
    }

    setErrs(next);

    const firstKey = Object.keys(next)[0];
    if (firstKey && refs.current[firstKey]) {
      refs.current[firstKey].scrollIntoView({ behavior: "smooth", block: "center" });
    }

    if (Object.keys(next).length) {
      setAlert({ type: "error", msg: "Revisa los campos marcados en rojo." });
      return false;
    }
    setAlert(null);
    return true;
  }

  // Envío
  async function onSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      nombre,
      correo,
      telefono,
      unidad,
      curp,
      rfc,
      modulo,
      tipo,
      descripcion,
      facilidades: isFacilidades
        ? {
            institucion: inst,
            evento,
            cantidadSolicitantes: Number(cantSolic || 0),
            diasSolicitados: diasNum,
            fecha: diasNum === 1 ? fecha : null,
            periodo: diasNum > 1 ? { desde: fini, hasta: ffin } : null,
            acuseKey,
            acuseName,
            acuseConfirm,
          }
        : null,
      adjuntos: adjuntosInfo,
    };

    try {
      const res = await fetch("/.netlify/functions/tickets-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo guardar el ticket.");

      setFolioOK(data.folio || "T-XXXX");
      setAlert({ type: "ok", msg: `¡Ticket registrado! Folio: ${data.folio}` });

      // Limpiar (para NUEVA asistencia). Conservamos los datos de contacto.
      setModulo("");
      setTipo("");
      setDescripcion("");
      setAdjuntos([]);
      setAdjuntosInfo([]);

      if (isFacilidades) {
        setAcuseKey("");
        setAcuseName("");
        setAcuseConfirm(false);
        setFecha("");
        setFini("");
        setFfin("");
        setDias("1");
        setCantSolic("1");
        setEvento("Capacitación");
        setInst(INSTITUCIONES[0]);
      }
    } catch (err) {
      setAlert({ type: "error", msg: String(err.message || err) });
    }
  }

  // Reset TOTAL + borrar perfil
  function resetAll() {
    setNombre("");
    setCorreo("");
    setTelefono("");
    setUnidad("");
    setCurp("");
    setRfc("");
    setModulo("");
    setTipo("");
    setDescripcion("");
    setAdjuntos([]);
    setAdjuntosInfo([]);
    setInst(INSTITUCIONES[0]);
    setEvento("Capacitación");
    setCantSolic("1");
    setDias("1");
    setFecha("");
    setFini("");
    setFfin("");
    setAcuseKey("");
    setAcuseName("");
    setAcuseConfirm(false);
    try { localStorage.removeItem(PROFILE_KEY); } catch {}
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {alert && (
        <div
          className={cx(
            "mb-6 rounded border px-4 py-3",
            alert.type === "error"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          )}
        >
          {alert.msg}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Mesa de Asistencia</h1>
          <p className="text-slate-600 mb-4">
            ¿Tienes una solicitud o problema? Registra tu ticket y el equipo correspondiente te atenderá.
          </p>
        </div>
        <button
          type="button"
          onClick={resetAll}
          className="h-10 shrink-0 rounded-md border px-4 font-medium hover:bg-slate-50"
          title="Borrar todos los campos y el autocompletado"
        >
          Limpiar todo
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        {/* Contacto */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Datos de contacto</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div ref={(el) => (refs.current.nombre = el)}>
              <input
                id="nombre"
                className={cx(baseInput, errs.nombre && errInput)}
                style={errStyle(!!errs.nombre)}
                placeholder="Nombre completo"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
              {errs.nombre && <p className="text-sm text-red-600 mt-1">{errs.nombre}</p>}
            </div>

            <div ref={(el) => (refs.current.correo = el)}>
              <input
                id="correo"
                type="email"
                className={cx(baseInput, errs.correo && errInput)}
                style={errStyle(!!errs.correo)}
                placeholder="Correo"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
              {errs.correo && <p className="text-sm text-red-600 mt-1">{errs.correo}</p>}
            </div>

            <input
              className={baseInput}
              placeholder="Teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
            <input
              className={baseInput}
              placeholder="Unidad de adscripción (opcional)"
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
            />
            <input
              className={baseInput}
              placeholder="CURP (opcional)"
              value={curp}
              onChange={(e) => setCurp(e.target.value)}
            />
            <input
              className={baseInput}
              placeholder="RFC (opcional)"
              value={rfc}
              onChange={(e) => setRfc(e.target.value)}
            />
          </div>
        </section>

        {/* Clasificación */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Clasificación</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div ref={(el) => (refs.current.modulo = el)}>
              <select
                className={cx(baseInput, errs.modulo && errInput)}
                style={errStyle(!!errs.modulo)}
                value={modulo}
                onChange={(e) => setModulo(e.target.value)}
              >
                <option value="">Secretaría / Módulo destino</option>
                {SECRETARIAS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {errs.modulo && <p className="text-sm text-red-600 mt-1">{errs.modulo}</p>}
            </div>

            <div ref={(el) => (refs.current.tipo = el)}>
              <select
                className={cx(baseInput, errs.tipo && errInput)}
                style={errStyle(!!errs.tipo)}
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                <option value="">Tipo de solicitud</option>
                {TIPO_SOLICITUD.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {errs.tipo && <p className="text-sm text-red-600 mt-1">{errs.tipo}</p>}
            </div>
          </div>
        </section>

        {/* Facilidades */}
        {isFacilidades && (
          <section className="rounded-lg border p-4 md:p-6">
            <h3 className="font-semibold mb-4">Facilidades administrativas</h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div ref={(el) => (refs.current.inst = el)}>
                <select
                  className={cx(baseInput, errs.inst && errInput)}
                  style={errStyle(!!errs.inst)}
                  value={inst}
                  onChange={(e) => setInst(e.target.value)}
                >
                  {INSTITUCIONES.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
                {errs.inst && <p className="text-sm text-red-600 mt-1">{errs.inst}</p>}
              </div>

              <input
                className={baseInput}
                type="number"
                min="1"
                value={cantSolic}
                onChange={(e) => setCantSolic(e.target.value)}
                placeholder="Cantidad de solicitantes"
              />

              <div ref={(el) => (refs.current.evento = el)}>
                <select
                  className={cx(baseInput, errs.evento && errInput)}
                  style={errStyle(!!errs.evento)}
                  value={evento}
                  onChange={(e) => setEvento(e.target.value)}
                >
                  {EVENTOS.map((ev) => (
                    <option key={ev} value={ev}>
                      {ev}
                    </option>
                  ))}
                </select>
                {errs.evento && <p className="text-sm text-red-600 mt-1">{errs.evento}</p>}
              </div>

              <div ref={(el) => (refs.current.dias = el)}>
                <input
                  className={cx(baseInput, errs.dias && errInput)}
                  style={errStyle(!!errs.dias)}
                  type="number"
                  min="1"
                  value={dias}
                  onChange={(e) => setDias(e.target.value)}
                  placeholder="Número de días solicitados"
                />
                {errs.dias && <p className="text-sm text-red-600 mt-1">{errs.dias}</p>}
              </div>

              {diasNum === 1 ? (
                <div className="md:col-span-2" ref={(el) => (refs.current.fecha = el)}>
                  <input
                    className={cx(baseInput, errs.fecha && errInput)}
                    style={errStyle(!!errs.fecha)}
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                  />
                  {errs.fecha && <p className="text-sm text-red-600 mt-1">{errs.fecha}</p>}
                </div>
              ) : (
                <>
                  <div ref={(el) => (refs.current.fini = el)}>
                    <input
                      className={cx(baseInput, errs.fini && errInput)}
                      style={errStyle(!!errs.fini)}
                      type="date"
                      value={fini}
                      onChange={(e) => setFini(e.target.value)}
                    />
                    {errs.fini && <p className="text-sm text-red-600 mt-1">{errs.fini}</p>}
                  </div>
                  <div ref={(el) => (refs.current.ffin = el)}>
                    <input
                      className={cx(baseInput, errs.ffin && errInput)}
                      style={errStyle(!!errs.ffin)}
                      type="date"
                      value={ffin}
                      onChange={(e) => setFfin(e.target.value)}
                    />
                    {errs.ffin && <p className="text-sm text-red-600 mt-1">{errs.ffin}</p>}
                  </div>
                </>
              )}
            </div>

            {/* Acuse RH (opcional + confirmación obligatoria) */}
            <div className="mt-4 grid md:grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Acuse entregado a RH (PDF/imagen, máx. 4 MB)
                </label>
                <input type="file" accept=".pdf,image/*" onChange={onAcuseChange} />
                <p className="text-sm mt-1">
                  {acuseUploading
                    ? "Subiendo acuse…"
                    : acuseName
                    ? `Archivo: ${acuseName}`
                    : "Puedes adjuntar el acuse aquí (recomendado)."}
                </p>
              </div>

              <div ref={(el) => (refs.current.acuseConfirm = el)} className="mt-2">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={acuseConfirm}
                    onChange={(e) => setAcuseConfirm(e.target.checked)}
                  />
                  <span>Confirmo que ya entregué el acuse a RH.</span>
                </label>
                {errs.acuseConfirm && (
                  <p className="text-sm text-red-600 mt-1">{errs.acuseConfirm}</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Descripción */}
        <section ref={(el) => (refs.current.descripcion = el)}>
          <h2 className="text-xl font-semibold mb-2">Descripción</h2>
          <textarea
            className={cx(baseInput, "min-h-[220px]", errs.descripcion && errInput)}
            style={errStyle(!!errs.descripcion)}
            placeholder="Describe brevemente tu solicitud o problema…"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
          {errs.descripcion && (
            <p className="text-sm text-red-600 mt-1">{errs.descripcion}</p>
          )}
        </section>

        {/* Adjuntos generales */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Adjuntar archivos</h2>
          <input multiple type="file" onChange={onAdjuntosChange} />
          {!!adjuntosInfo.length && (
            <div className="text-sm text-slate-600 mt-2">
              {adjuntosInfo.length} archivo(s) seleccionado(s).
            </div>
          )}
        </section>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-md bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 font-medium"
        >
          Registrar ticket
        </button>
      </form>

      {/* Modal folio */}
      {folioOK && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <h4 className="text-xl font-semibold mb-2">¡Ticket registrado!</h4>
            <p className="mb-6">Tu folio es <b>{folioOK}</b>.</p>
            <div className="text-right">
              <button
                onClick={() => setFolioOK("")}
                className="rounded-md bg-slate-800 hover:bg-slate-900 text-white px-4 py-2"
              >
                Nueva solicitud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
