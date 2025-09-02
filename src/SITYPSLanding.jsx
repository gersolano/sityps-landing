// src/SITYPSLanding.jsx
import React, { useState } from "react";

export default function SITYPSLanding() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-slate-800">
            SITYPS
          </h1>
          <a href="#preafiliacion-form" className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm hover:bg-emerald-700">
            Ir a Preafiliación
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-3xl font-bold text-slate-900">Sistema SITYPS</h2>
        <p className="mt-2 text-slate-600">
          Gestión en red local. Este sitio público solo recibe <b>preafiliaciones</b> y las envía por correo a Actas y Acuerdos.
        </p>
      </section>

      {/* Preafiliación */}
      <section id="preafiliacion-form" className="mx-auto max-w-3xl px-4 pb-16">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-lg font-semibold">Preafiliación</h3>
            <p className="text-xs text-slate-600 mt-1">
              Esta solicitud se envía por correo a <span className="font-medium">Actas y Acuerdos</span> para iniciar el trámite.
            </p>
          </div>
          <PreafiliacionForm />
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} SITYPS — Todos los derechos reservados.
      </footer>
    </div>
  );
}

function PreafiliacionForm() {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setOk(false);
    setErr("");
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    payload.privacyAccepted = form.get("privacyAccepted") === "on";

    try {
      const res = await fetch("/.netlify/functions/preafiliacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOk(true);
      e.currentTarget.reset();
    } catch {
      setErr("No se pudo enviar la solicitud. Intenta de nuevo o escribe a actas@sityps.org.mx.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-4 grid grid-cols-1 gap-4">
      {ok && <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 px-3 py-2 text-sm">¡Listo! Tu preafiliación fue enviada.</div>}
      {err && <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 px-3 py-2 text-sm">{err}</div>}

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
        <textarea name="observaciones" rows={3} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-600" />
      </div>

      <div className="flex items-start gap-2">
        <input type="checkbox" name="privacyAccepted" required className="mt-1" />
        <label className="text-xs text-slate-600">Acepto el aviso de privacidad y autorizo el uso de mis datos para efectos de afiliación.</label>
      </div>

      <div className="pt-1">
        <button disabled={loading} className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-white text-sm font-medium shadow hover:bg-emerald-700 disabled:opacity-50">
          {loading ? "Enviando…" : "Enviar solicitud"}
        </button>
      </div>

      <div className="text-[11px] text-slate-500">
        * Implementa reCAPTCHA antes de producción. Este formulario envía un correo a Actas y Acuerdos y <em>no</em> escribe en la base local.
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
        className={`mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-600 ${upper ? "uppercase tracking-wider" : ""}`}
      />
    </div>
  );
}
