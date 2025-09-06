import { useMemo, useState } from "react";

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

function cx(...cls) { return cls.filter(Boolean).join(" "); }

export default function Asistencia() {
  const [alert, setAlert] = useState(null);              // {type: 'error'|'ok', msg: string}
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

  // acuse RH
  const [acuseKey, setAcuseKey] = useState("");
  const [acuseName, setAcuseName] = useState("");
  const [acuseUploading, setAcuseUploading] = useState(false);
  const [acuseConfirm, setAcuseConfirm] = useState(false);

  // adjuntos generales
  const [adjuntos, setAdjuntos] = useState([]);
  const [adjuntosInfo, setAdjuntosInfo] = useState([]); // {name,size} p/mostrar

  // descripción
  const [descripcion, setDescripcion] = useState("");

  // errores para borde rojo
  const [errs, setErrs] = useState({});

  const isFacilidades = useMemo(() => tipo === "Facilidades administrativas", [tipo]);
  const diasNum = useMemo(() => Number(dias || 0), [dias]);

  // ---------- Subida de ACUSE a función -----------
  async function onAcuseChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setAlert({ type: "error", msg: "El acuse debe pesar máximo 4MB." });
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
    setAdjuntosInfo(files.map(f => ({ name: f.name, size: f.size })));
  }

  // ------------- Validación (relajada para no bloquear por acuse) -------------
  function validate() {
    const next = {};
    const req = (v) => (v && String(v).trim().length > 0);

    if (!req(nombre)) next.nombre = true;
    if (!req(correo)) next.correo = true;
    if (!req(modulo)) next.modulo = true;
    if (!req(tipo)) next.tipo = true;
    if (!req(descripcion)) next.descripcion = true;

    if (isFacilidades) {
      if (!req(inst)) next.inst = true;
      if (!req(evento)) next.evento = true;
      if (!diasNum || diasNum < 1) next.dias = true;

      if (diasNum === 1) {
        if (!req(fecha)) next.fecha = true;
      } else {
        if (!req(fini)) next.fini = true;
        if (!req(ffin)) next.ffin = true;
      }

      // 🔴 Ahora solo pedimos CONFIRMAR el acuse (el archivo ya no bloquea).
      if (!acuseConfirm) next.acuseConfirm = true;
    }

    setErrs(next);

    if (Object.keys(next).length) {
      if (next.acuseConfirm) {
        setAlert({ type: "error", msg: "Marca la casilla de confirmación del acuse entregado a RH." });
      } else if (next.dias || next.fecha || next.fini || next.ffin) {
        setAlert({ type: "error", msg: "Indica número de días y las fechas solicitadas." });
      } else {
        setAlert({ type: "error", msg: "Completa los campos obligatorios marcados en rojo." });
      }
      return false;
    }
    setAlert(null);
    return true;
  }

  // ---------------- Envío ----------------
  async function onSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      nombre, correo, telefono, unidad, curp, rfc,
      modulo, tipo, descripcion,
      facilidades: isFacilidades ? {
        institucion: inst,
        evento,
        cantidadSolicitantes: cantSolic,
        diasSolicitados: diasNum,
        fecha: diasNum === 1 ? fecha : null,
        periodo: diasNum > 1 ? { desde: fini, hasta: ffin } : null,
        acuseKey,        // puede venir vacío si no se subió
        acuseName,       // nombre del acuse seleccionado
        acuseConfirm,    // ✅ obligatorio
      } : null,
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

      // mostrar folio
      setFolioOK(data.folio || "T-XXXX");
      setAlert({ type: "ok", msg: `¡Ticket registrado! Folio: ${data.folio}` });

      // limpiar mínimos
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {alert && (
        <div className={cx(
          "mb-6 rounded border px-4 py-3",
          alert.type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
        )}>{alert.msg}</div>
      )}

      <h1 className="text-3xl font-bold mb-2">Mesa de Asistencia</h1>
      <p className="text-slate-600 mb-8">
        ¿Tienes una solicitud o problema? Registra tu ticket y el equipo correspondiente te atenderá.
      </p>

      <form onSubmit={onSubmit} className="space-y-8">
        {/* Contacto */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Datos de contacto</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input className={cx("input", errs.nombre && "border-red-400")} placeholder="Nombre completo"
              value={nombre} onChange={e=>setNombre(e.target.value)} />
            <input className={cx("input", errs.correo && "border-red-400")} placeholder="Correo" type="email"
              value={correo} onChange={e=>setCorreo(e.target.value)} />
            <input className="input" placeholder="Teléfono"
              value={telefono} onChange={e=>setTelefono(e.target.value)} />
            <input className="input" placeholder="Unidad de adscripción (opcional)"
              value={unidad} onChange={e=>setUnidad(e.target.value)} />
            <input className="input" placeholder="CURP (opcional)"
              value={curp} onChange={e=>setCurp(e.target.value)} />
            <input className="input" placeholder="RFC (opcional)"
              value={rfc} onChange={e=>setRfc(e.target.value)} />
          </div>
        </section>

        {/* Clasificación */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Clasificación</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <select className={cx("input", errs.modulo && "border-red-400")}
              value={modulo} onChange={e=>setModulo(e.target.value)}>
              <option value="">Secretaría / Módulo destino</option>
              {SECRETARIAS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className={cx("input", errs.tipo && "border-red-400")}
              value={tipo} onChange={e=>setTipo(e.target.value)}>
              <option value="">Tipo de solicitud</option>
              {TIPO_SOLICITUD.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </section>

        {/* Facilidades */}
        {isFacilidades && (
          <section className="rounded-lg border p-4 md:p-6">
            <h3 className="font-semibold mb-4">Facilidades administrativas</h3>

            <div className="grid md:grid-cols-2 gap-4">
              <select className={cx("input", errs.inst && "border-red-400")}
                value={inst} onChange={e=>setInst(e.target.value)}>
                {INSTITUCIONES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>

              <input className="input" type="number" min="1" value={cantSolic}
                onChange={e=>setCantSolic(e.target.value)} placeholder="Cantidad de solicitantes" />

              <select className={cx("input", errs.evento && "border-red-400")}
                value={evento} onChange={e=>setEvento(e.target.value)}>
                {EVENTOS.map(ev => <option key={ev} value={ev}>{ev}</option>)}
              </select>

              <input className={cx("input", errs.dias && "border-red-400")}
                type="number" min="1" value={dias} onChange={e=>setDias(e.target.value)}
                placeholder="Número de días solicitados" />

              {diasNum === 1 ? (
                <input className={cx("input md:col-span-2", errs.fecha && "border-red-400")}
                  type="date" value={fecha} onChange={e=>setFecha(e.target.value)} />
              ) : (
                <>
                  <input className={cx("input", errs.fini && "border-red-400")}
                    type="date" value={fini} onChange={e=>setFini(e.target.value)} />
                  <input className={cx("input", errs.ffin && "border-red-400")}
                    type="date" value={ffin} onChange={e=>setFfin(e.target.value)} />
                </>
              )}
            </div>

            {/* Acuse RH */}
            <div className="mt-4 grid md:grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Acuse entregado a RH (PDF/imagen, máx. 4MB)
                </label>
                <input type="file" accept=".pdf,image/*" onChange={onAcuseChange} />
                <div className="text-sm mt-1">
                  {acuseUploading ? "Subiendo acuse…" : acuseName ? `Archivo: ${acuseName}` : null}
                </div>
              </div>

              <label className="inline-flex items-center gap-2 mt-2">
                <input type="checkbox" checked={acuseConfirm}
                  onChange={(e)=>setAcuseConfirm(e.target.checked)} />
                <span>Confirmo que ya entregué el acuse a RH.</span>
              </label>
              {errs.acuseConfirm && (
                <div className="text-sm text-red-600 md:col-span-2">
                  Debes marcar esta confirmación.
                </div>
              )}
            </div>
          </section>
        )}

        {/* Descripción */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Descripción</h2>
          <textarea className={cx("input min-h-[140px]", errs.descripcion && "border-red-400")}
            placeholder="Describe brevemente tu solicitud o problema…"
            value={descripcion} onChange={e=>setDescripcion(e.target.value)} />
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

        <button type="submit"
          className="inline-flex items-center justify-center rounded-md bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 font-medium">
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
              <button onClick={() => setFolioOK("")}
                className="rounded-md bg-slate-800 hover:bg-slate-900 text-white px-4 py-2">
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Tailwind helper si falta:
.input { @apply w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-red-300; }
*/
