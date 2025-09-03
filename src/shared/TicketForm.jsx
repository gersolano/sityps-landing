import React, { useEffect, useRef, useState } from "react";
import cfg from "../../sityps.config.json";

const DEFAULT_TIPOS = [
  { id: "conflicto-laboral", nombre: "Conflicto laboral" },
  { id: "actualizacion-datos", nombre: "Alta/Baja/Actualización de datos" },
  { id: "cuotas", nombre: "Cuotas/Descuentos/Recibos" },
  { id: "pagos-proveedores", nombre: "Pagos/Proveedores/Viáticos/Laudos" },
  { id: "capacitacion", nombre: "Capacitación/Constancias" },
  { id: "escalafon", nombre: "Escalafón/Adscripciones/Bolsa de trabajo" },
  { id: "prestaciones", nombre: "Prestaciones/Crédito/Vivienda" },
  { id: "prensa", nombre: "Comunicados/Difusión" },
  { id: "consultorios", nombre: "Consultorios/Convenios" },
  { id: "deporte-cultura", nombre: "Eventos deportivos/culturales" },
  { id: "honor-justicia", nombre: "Honor y Justicia" },
  { id: "electoral", nombre: "Electoral" },
  { id: "facilidades", nombre: "Facilidades Administrativas" }, // NUEVO
];

const EVENTO_OPCIONES = [
  "Comisión sindical",
  "Curso/Capacitación",
  "Asamblea",
  "Audiencia/Autoridad",
  "Incidencia médica",
  "Otro",
];

export default function TicketForm() {
  const tipos = (cfg.tickets?.tipos && Array.isArray(cfg.tickets.tipos) && cfg.tickets.tipos.length)
    ? cfg.tickets.tipos
    : DEFAULT_TIPOS;

  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [captchaOk, setCaptchaOk] = useState(false);
  const [folio, setFolio] = useState("");

  const [files, setFiles] = useState([]);       // Adjuntos generales
  const [acuseFile, setAcuseFile] = useState(null); // Acuse RH (1 archivo)
  const [tipoSel, setTipoSel] = useState("");

  const hideTimer = useRef(null);
  const formRef = useRef(null);
  const confirmBtnRef = useRef(null);

  // reCAPTCHA v2
  const recaptchaDivRef = useRef(null);
  const widgetIdRef = useRef(null);
  const siteKey = cfg.recaptcha?.siteKey || "";

  useEffect(() => {
    if (!siteKey) return;
    if (!document.getElementById("recaptchaScript")) {
      const s = document.createElement("script");
      s.id = "recaptchaScript";
      s.src = "https://www.google.com/recaptcha/api.js?hl=es&render=explicit";
      s.async = true; s.defer = true;
      document.head.appendChild(s);
    }
    const t = setInterval(() => {
      if (window.grecaptcha && !widgetIdRef.current && recaptchaDivRef.current) {
        widgetIdRef.current = window.grecaptcha.render(recaptchaDivRef.current, {
          sitekey: siteKey,
          theme: "light",
          callback: () => setCaptchaOk(true),
          "expired-callback": () => { setCaptchaOk(false); showErr("La verificación del reCAPTCHA caducó. Vuelve a marcar la casilla."); },
          "error-callback": () => { setCaptchaOk(false); showErr("Hubo un problema con reCAPTCHA. Vuelve a marcar la casilla."); },
        });
        clearInterval(t);
      }
    }, 300);
    return () => clearInterval(t);
  }, [siteKey]);

  function showOk() {
    setOk(true); setErr("");
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setOk(false), 6000);
  }
  function showErr(message) {
    setErr(message || "No se pudo registrar el ticket. Intenta de nuevo o escribe a contacto@sityps.org.mx.");
    setOk(false);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setErr(""), 8000);
  }

  function onFilesChange(e) {
    const fl = Array.from(e.target.files || []);
    const allowed = [];
    let total = 0;
    for (const f of fl.slice(0, 3)) {
      const okType = /pdf|image\/jpeg|image\/png/i.test(f.type);
      if (!okType) continue;
      total += f.size;
      if (f.size > 2 * 1024 * 1024) continue; // >2MB c/u
      allowed.push(f);
    }
    if (total > 5 * 1024 * 1024) {
      showErr("El total de adjuntos supera 5 MB.");
      return;
    }
    setFiles(allowed);
  }
  function onAcuseChange(e) {
    const f = e.target.files?.[0];
    if (!f) { setAcuseFile(null); return; }
    const okType = /pdf|image\/jpeg|image\/png/i.test(f.type);
    if (!okType) { showErr("El acuse debe ser PDF/JPG/PNG."); e.target.value=""; return; }
    if (f.size > 2 * 1024 * 1024) { showErr("El acuse no debe exceder 2 MB."); e.target.value=""; return; }
    setAcuseFile(f);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true); setOk(false); setErr(""); setFolio("");

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    payload.privacyAccepted = form.get("privacyAccepted") === "on";

    // Tipo seleccionado (para validaciones específicas)
    const tipo = payload.tipo;

    // Validaciones de Facilidades
    if (tipo === "facilidades") {
      const req = ["cantidadSolicitantes","fechasSolicitadas","tipoEvento","institucion"];
      for (const k of req) {
        if (!String(payload[k] || "").trim()) {
          setSubmitting(false);
          showErr(`Falta ${etiquetaCampo(k)} (Facilidades)`);
          return;
        }
      }
    }

    // reCAPTCHA
    if (siteKey) {
      const token = window.grecaptcha?.getResponse ? window.grecaptcha.getResponse(widgetIdRef.current) : "";
      if (!token) { setSubmitting(false); setCaptchaOk(false); showErr("Por favor marca 'No soy un robot'."); return; }
      payload.recaptchaToken = token;
    }

    // Adjuntos → base64
    const outFiles = [];
    if (files.length) {
      for (const f of files) {
        const base64 = await fileToBase64(f);
        outFiles.push({ filename: f.name, contentType: f.type, base64 });
      }
    }
    if (acuseFile) {
      const base64 = await fileToBase64(acuseFile);
      outFiles.push({ filename: acuseFile.name, contentType: acuseFile.type, base64, purpose: "acuseRh" });
    }
    if (outFiles.length) payload.files = outFiles;

    try {
      const res = await fetch("/.netlify/functions/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let resp, isJson = false;
      try { resp = await res.json(); isJson = true; } catch { try { resp = await res.text(); } catch { resp = null; } }

      if (res.ok && (isJson ? resp?.ok === true : true)) {
        showOk();
        if (resp?.folio) setFolio(resp.folio);

        // Limpieza
        try { formRef.current?.reset(); } catch {}
        setFiles([]); setAcuseFile(null); setTipoSel("");
        try {
          formRef.current?.querySelectorAll("input, textarea, select").forEach((el) => {
            if (el.type !== "checkbox" && el.type !== "radio") el.value = "";
            if (el.type === "checkbox") el.checked = false;
            el.blur();
          });
        } catch {}

        try {
          if (siteKey && window.grecaptcha?.reset && widgetIdRef.current !== null) {
            window.grecaptcha.reset(widgetIdRef.current);
          }
          setCaptchaOk(false);
        } catch {}

        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        setShowModal(true);
        setTimeout(() => confirmBtnRef.current?.focus(), 50);
        return;
      }

      const msg = isJson
        ? (resp?.message || "No se pudo registrar el ticket.")
        : (typeof resp === "string" && resp.trim() ? resp : `HTTP ${res.status}`);

      try {
        if (siteKey && window.grecaptcha?.reset && widgetIdRef.current !== null) {
          window.grecaptcha.reset(widgetIdRef.current);
        }
        setCaptchaOk(false);
      } catch {}
      showErr(msg);
    } catch {
      showErr();
    } finally {
      setSubmitting(false);
    }
  }

  function handleModalAccept() {
    setShowModal(false);
    window.location.reload();
  }

  return (
    <>
      <form ref={formRef} onSubmit={onSubmit} className="p-4 grid grid-cols-1 gap-4" autoComplete="off" noValidate>
        {ok && !err && (
          <div role="status" className="rounded-xl border border-green-200 bg-green-50 text-green-800 px-3 py-2 text-sm">
            <b>¡Gracias!</b> Tu ticket fue registrado correctamente.
          </div>
        )}
        {err && !ok && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 px-3 py-2 text-sm">
            {err}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <Field name="nombre" label="Nombre completo" required />
          <Field name="correo" label="Correo" type="email" required />
          <Field name="telefono" label="Teléfono" required />
          <Field name="unidadAdscripcion" label="Unidad de adscripción (opcional)" />
          <Field name="curp" label="CURP (opcional)" upper />
          <Field name="rfc" label="RFC (opcional)" upper />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Tipo de solicitud */}
          <div>
            <label className="text-xs text-slate-600">Tipo de solicitud</label>
            <select
              name="tipo"
              required
              value={tipoSel}
              onChange={(e)=>setTipoSel(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Selecciona una opción…</option>
              {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>

          {/* Prioridad */}
          <div>
            <label className="text-xs text-slate-600">Prioridad</label>
            <select name="prioridad" defaultValue="Media" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option>Alta</option>
              <option>Media</option>
              <option>Baja</option>
            </select>
          </div>
        </div>

        {/* Campos extra para Facilidades Administrativas */}
        {tipoSel === "facilidades" && (
          <fieldset className="rounded-xl border border-primary-100 bg-primary-50/30 p-3">
            <legend className="px-2 text-xs font-medium text-primary-800">Facilidades Administrativas</legend>

            <div className="grid sm:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="text-xs text-slate-600">¿Cuántos solicitan?</label>
                <div className="mt-1 flex items-center gap-4 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="cantidadSolicitantes" value="uno" required /> Una persona
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="cantidadSolicitantes" value="varios" required /> Varias personas
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600">Tipo de evento/incidencia</label>
                <select name="tipoEvento" required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Selecciona…</option>
                  {EVENTO_OPCIONES.map(op => <option key={op} value={op}>{op}</option>)}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-2">
              <Field name="fechasSolicitadas" label="Fechas solicitadas (rango o lista)" required />
              <Field name="institucion" label="Institución para la que labora" required />
            </div>

            <div className="mt-2">
              <label className="text-xs text-slate-600">Acuse entregado a RH (PDF/JPG/PNG, máx 2MB)</label>
              <input type="file" accept=".pdf,image/jpeg,image/png" onChange={onAcuseChange}
                     className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-2" />
              {acuseFile && (
                <p className="mt-1 text-xs text-slate-600">Adjuntado: {acuseFile.name} ({Math.round(acuseFile.size/1024)} KB)</p>
              )}
            </div>
          </fieldset>
        )}

        {/* Descripción general */}
        <div>
          <label className="text-xs text-slate-600">Descripción</label>
          <textarea name="descripcion" rows={5}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-600"
            placeholder="Describe tu solicitud o problema…" required />
        </div>

        {/* Adjuntos generales */}
        <div>
          <label className="text-xs text-slate-600">Adjuntos (PDF/JPG/PNG, máx 3 – 2MB c/u, 5MB total)</label>
          <input type="file" multiple accept=".pdf,image/jpeg,image/png" onChange={onFilesChange}
                 className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-2" />
          {files?.length > 0 && (
            <ul className="mt-2 text-xs text-slate-600 list-disc pl-5">
              {files.map(f => <li key={f.name}>{f.name} ({Math.round(f.size/1024)} KB)</li>)}
            </ul>
          )}
        </div>

        {/* Aviso de privacidad */}
        <div className="flex items-start gap-3">
          <input id="privacyAccepted" name="privacyAccepted" type="checkbox" required
                 className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-600" />
          <label htmlFor="privacyAccepted" className="text-sm text-slate-700">
            He leído y acepto el{" "}
            <a href={cfg.site?.privacyUrl || "#/aviso-privacidad"} className="text-primary-700 underline">Aviso de Privacidad</a>.
          </label>
        </div>

        {/* reCAPTCHA v2 */}
        {siteKey && (
          <div>
            <label className="text-xs text-slate-600">Verificación</label>
            <div ref={recaptchaDivRef} className="mt-2" />
          </div>
        )}

        <div className="pt-1">
          <button disabled={submitting || (siteKey && !captchaOk)}
                  className="inline-flex items-center rounded-xl bg-primary-600 px-4 py-2 text-white text-sm font-medium shadow hover:bg-primary-700 disabled:opacity-50">
            {submitting ? "Enviando…" : "Enviar ticket"}
          </button>
          {siteKey && !captchaOk && (
            <span className="ml-3 text-xs text-slate-500">Marca “No soy un robot” para habilitar el envío.</span>
          )}
        </div>
      </form>

      {/* Modal de confirmación */}
      {showModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true"
             onKeyDown={(e)=>{ if(e.key === "Escape") handleModalAccept(); }}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="p-5 border-b">
              <h2 className="text-lg font-semibold text-slate-800">¡Ticket enviado!</h2>
            </div>
            <div className="p-5 text-sm text-slate-700">
              Tu ticket fue registrado correctamente.
              {folio ? <> <br/>Folio: <b>{folio}</b></> : null}
            </div>
            <div className="p-4 flex justify-end gap-2 border-t">
              <button ref={confirmBtnRef} onClick={handleModalAccept}
                      className="rounded-lg bg-primary-600 text-white px-4 py-2 text-sm font-medium hover:bg-primary-700">
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ name, label, required, type="text", upper }) {
  return (
    <div>
      <label className="text-xs text-slate-600">{label}</label>
      <input name={name} required={required} type={type} autoComplete="off"
             className={`mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-600 ${upper ? "uppercase tracking-wider" : ""}`} />
    </div>
  );
}

function etiquetaCampo(k) {
  const map = {
    cantidadSolicitantes: "cantidad de solicitantes",
    fechasSolicitadas: "fechas solicitadas",
    tipoEvento: "tipo de evento/incidencia",
    institucion: "institución",
  };
  return map[k] || k;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result || "").toString().split(",").pop() || "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
