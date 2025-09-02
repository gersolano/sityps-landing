import React, { useRef, useEffect, useState } from "react";
import cfg from "../../sityps.config.json";

export default function PreafiliacionForm() {
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");
  const hideTimer = useRef(null);

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
        widgetIdRef.current = window.grecaptcha.render(recaptchaDivRef.current, { sitekey: siteKey, theme: "light" });
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
  function showErr(msg) {
    setErr(msg || "No se pudo enviar la solicitud. Intenta de nuevo o escribe a actas@sityps.org.mx.");
    setOk(false);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setErr(""), 8000);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true); setOk(false); setErr("");

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());

    // Normaliza aceptación del aviso de privacidad
    const acceptedRaw = form.get("privacyAccepted");
    payload.privacyAccepted = acceptedRaw === "on" || acceptedRaw === "1" || acceptedRaw === "true";

    // Adjunta token reCAPTCHA si hay siteKey
    if (siteKey) {
      const token = window.grecaptcha?.getResponse ? window.grecaptcha.getResponse(widgetIdRef.current) : "";
      if (!token) { setSubmitting(false); showErr("Por favor marca 'No soy un robot'."); return; }
      payload.recaptchaToken = token;
    }

    try {
      const res = await fetch("/.netlify/functions/preafiliacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        showErr(text || `HTTP ${res.status}`);
        return;
      }
      showOk();

      // Limpieza total del formulario
      e.currentTarget.reset();
      Array.from(e.currentTarget.querySelectorAll("input, textarea")).forEach(el => {
        if (el.type !== "checkbox" && el.type !== "radio") el.value = "";
        if (el.type === "checkbox") el.checked = false;
      });
      if (siteKey && window.grecaptcha?.reset && widgetIdRef.current !== null) {
        window.grecaptcha.reset(widgetIdRef.current);
      }
      (document.activeElement instanceof HTMLElement) && document.activeElement.blur();
    } catch {
      showErr();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-4 grid grid-cols-1 gap-4">
      {ok && !err && (
        <div role="status" className="rounded-xl border border-green-200 bg-green-50 text-green-800 px-3 py-2 text-sm">
          <b>¡Gracias!</b> Tu preafiliación se envió correctamente. Muy pronto el área de <b>Afiliación</b> se pondrá en contacto contigo.
        </div>
      )}
      {err && !ok && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field name="nombres" label="Nombre(s)" required />
        <Field name="apellidoPaterno" label="Apellido paterno" required />
        <Field name="apellidoMaterno" label="Apellido materno" required />
        <Field name="curp" label="CURP" required upper />
        <Field name="rfc" label="RFC" required upper />
        <Field name="nss" label="NSS (opcional)" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field name="telefono" label="Teléfono" required />
        <Field name="correo" label="Correo" required type="email" />
        <Field name="seccion" label="Sección" required />
        <Field name="empresa" label="Empresa/Institución" required />
      </div>

      <Field name="domicilio" label="Domicilio" required />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field name="municipio" label="Municipio" required />
        <Field name="estado" label="Estado" required />
      </div>

      <div>
        <label className="text-xs text-slate-600">Observaciones</label>
        <textarea name="observaciones" rows={3}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-600" />
      </div>

      {/* Aceptación de Aviso de Privacidad */}
      <div className="flex items-start gap-3">
        <input
          id="privacyAccepted"
          name="privacyAccepted"
          type="checkbox"
          required
          className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-600"
        />
        <label htmlFor="privacyAccepted" className="text-sm text-slate-700">
          He leído y acepto el{" "}
          <a href={cfg.site?.privacyUrl || "#/aviso-privacidad"} className="text-primary-700 underline" target="_self" rel="noopener">
            Aviso de Privacidad
          </a>.
        </label>
      </div>

      {/* Widget reCAPTCHA v2 */}
      {siteKey && (
        <div>
          <label className="text-xs text-slate-600">Verificación</label>
          <div ref={recaptchaDivRef} className="mt-2" />
        </div>
      )}

      <div className="pt-1">
        <button
          disabled={submitting}
          className="inline-flex items-center rounded-xl bg-primary-600 px-4 py-2 text-white text-sm font-medium shadow hover:bg-primary-700 disabled:opacity-50"
        >
          {submitting ? "Enviando…" : "Enviar solicitud"}
        </button>
      </div>
    </form>
  );
}

function Field({ name, label, required, type = "text", upper }) {
  return (
    <div>
      <label className="text-xs text-slate-600">{label}</label>
      <input
        name={name}
        required={required}
        type={type}
        className={`mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-600 ${upper ? "uppercase tracking-wider" : ""}`}
      />
    </div>
  );
}
