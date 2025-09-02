// src/SITYPSLanding.jsx
import React, { useState, useRef } from "react";
import cfg from "../sityps.config.json";

export default function SITYPSLanding() {
  const nav = [
    ["Inicio", "#top"],
    ["Misión y Visión", "#mision"],
    ["Principios y Valores", "#principios"],
    ["Gestiones y Logros", "#logros"],
    ["Servicios a la comunidad", "#servicios"],
    ["Derechos y Obligaciones", "#derechos"],
    ["Directorio", "#directorio"],
    ["Contacto", "#contacto"]
  ];

  return (
    <div id="top" className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={cfg.site?.logo || "/logo.svg"}
              alt="SITYPS"
              className="h-7 w-auto"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            <span className="text-lg font-semibold tracking-tight text-slate-800">
              {cfg.site?.name || "SITYPS"}
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-5 text-sm">
            {nav.map(([t, h]) => (
              <a key={h} href={h} className="text-slate-600 hover:text-slate-900">{t}</a>
            ))}
            <a href={cfg.site?.privacyUrl || "#/aviso-privacidad"} className="text-slate-600 hover:text-slate-900">
              Aviso de privacidad
            </a>
            <a
              href="#preafiliacion-form"
              className="rounded-lg bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700"
            >
              Preafiliación
            </a>
          </nav>
          <div className="md:hidden flex items-center gap-2">
            <a href={cfg.site?.privacyUrl || "#/aviso-privacidad"} className="text-xs text-slate-600 underline">
              Aviso
            </a>
            <a
              href="#preafiliacion-form"
              className="rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm"
            >
              Preafiliación
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Sistema SITYPS</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Gestión en red local. Este sitio público recibe <b>preafiliaciones</b> y las envía por correo
          al área de <b>Afiliación</b> para iniciar el trámite.
        </p>
        {cfg.site?.motto && (
          <p className="mt-3 text-emerald-700 font-medium">{cfg.site.motto}</p>
        )}
      </section>

      {/* Secciones… (idénticas a la versión anterior) */}
      {/* Misión / Visión */}
      <Section id="mision" title="Misión y Visión">
        <div className="grid md:grid-cols-2 gap-6">
          <Card title="Misión">
            <p className="text-slate-700">{cfg.content?.mission}</p>
          </Card>
          <Card title="Visión">
            <p className="text-slate-700">{cfg.content?.vision}</p>
          </Card>
        </div>
      </Section>

      {/* Principios / Valores */}
      <Section id="principios" title="Principios y Valores">
        <div className="grid md:grid-cols-2 gap-6">
          <Card title="Principios">
            <Pills items={cfg.content?.principles || []} />
          </Card>
          <Card title="Valores">
            <Pills items={cfg.content?.values || []} />
          </Card>
        </div>
      </Section>

      {/* Logros */}
      <Section id="logros" title="Gestiones y Logros">
        <ul className="list-disc pl-5 space-y-1 text-slate-700">
          {(cfg.content?.achievements || []).map((li, i) => <li key={i}>{li}</li>)}
        </ul>
      </Section>

      {/* Servicios a la comunidad */}
      <Section id="servicios" title="Servicios a la comunidad">
        <ul className="list-disc pl-5 space-y-1 text-slate-700">
          {(cfg.content?.community || []).map((li, i) => <li key={i}>{li}</li>)}
        </ul>
      </Section>

      {/* Derechos / Obligaciones (resumen) */}
      <Section id="derechos" title="Derechos y Obligaciones de las personas afiliadas">
        <div className="grid md:grid-cols-2 gap-6">
          <Card title="Derechos (resumen)">
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
              <li>Votar y ser votado; participar en órganos sindicales.</li>
              <li>Representación y defensa sindical ante autoridades.</li>
              <li>Acceso a beneficios, información y asesoría legal.</li>
              <li>Libertades de asociación, expresión y manifestación.</li>
            </ul>
          </Card>
          <Card title="Obligaciones (resumen)">
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
              <li>Respetar estatutos, acuerdos y resoluciones.</li>
              <li>Participar en actividades y procesos electorales.</li>
              <li>Contribuir con cuotas y mantener datos actualizados.</li>
              <li>Tramitar asuntos sindicales por las vías internas.</li>
            </ul>
          </Card>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Consulta el detalle en Estatutos del SITYPS.
        </p>
      </Section>

      {/* Directorio */}
      <Section id="directorio" title="Directorio">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(cfg.directory?.comiteEjecutivo || []).map(([name, role]) => (
            <div key={name} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="font-semibold text-slate-800">{name}</div>
              <div className="text-sm text-slate-600">{role}</div>
            </div>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {(cfg.directory?.organos || []).map(([org, head]) => (
            <div key={org} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="font-semibold text-slate-800">{org}</div>
              <div className="text-sm text-slate-600">{head}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Afíliate */}
      <Section title="Afíliate">
        <div className="grid md:grid-cols-2 gap-6">
          <Card title="¿Por qué afiliarse?">
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
              {(cfg.content?.affiliateBullets || []).map((li, i) => <li key={i}>{li}</li>)}
            </ul>
            <p className="mt-3 text-slate-700">
              Únete a la familia SITYPS y fortalece tus derechos laborales con una organización democrática.
            </p>
          </Card>
          <Card title="¿Cómo inicio?">
            <ol className="list-decimal pl-5 space-y-1 text-slate-700">
              <li>Completa la <a className="text-emerald-700 underline" href="#preafiliacion-form">preafiliación</a>.</li>
              <li>Personal de Afiliación te contactará para revisar requisitos.</li>
              <li>Recibirás seguimiento hasta tu alta formal.</li>
            </ol>
          </Card>
        </div>
      </Section>

      {/* Preafiliación */}
      <Section id="preafiliacion-form" title="Preafiliación">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <p className="text-xs text-slate-600">
              Esta solicitud se envía por correo al área de <b>Afiliación</b> para iniciar el trámite.
            </p>
          </div>
          <PreafiliacionForm />
        </div>
      </Section>

      {/* Contacto */}
      <Section id="contacto" title="Contacto">
        <div className="grid md:grid-cols-3 gap-6">
          <Card title="Dirección">
            <p className="text-slate-700">{cfg.contact?.address}</p>
          </Card>
          <Card title="Teléfono / Correo">
            <p className="text-slate-700">{cfg.contact?.phone}</p>
            <p className="text-slate-700">{cfg.contact?.email}</p>
          </Card>
          <Card title="Redes">
            <p className="text-slate-700">Facebook: {cfg.contact?.social?.facebook}</p>
            <p className="text-slate-700">TikTok: {cfg.contact?.social?.tiktok}</p>
          </Card>
        </div>
      </Section>

      <footer className="py-10 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {cfg.site?.name || "SITYPS"} — Todos los derechos reservados.
      </footer>
    </div>
  );
}

/* ---------- Subcomponentes (idénticos a la versión previa) ---------- */
function Section({ id, title, children }) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-4 py-10">
      {title && <h2 className="text-2xl font-bold text-slate-900">{title}</h2>}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {title && <div className="text-base font-semibold mb-2">{title}</div>}
      {children}
    </div>
  );
}

function Pills({ items }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((x) => (
        <span key={x} className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700">
          {x}
        </span>
      ))}
    </div>
  );
}

function PreafiliacionForm() {
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");
  const hideTimer = useRef(null);

  function showOk() {
    setOk(true);
    setErr("");
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
    setSubmitting(true);
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
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        showErr(text || `HTTP ${res.status}`);
        return;
      }
      showOk();
      e.currentTarget.reset();
      e.currentTarget.querySelector("input,textarea,button")?.focus();
    } catch {
      showErr();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-4 grid grid-cols-1 gap-4">
      {ok && !err && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 px-3 py-2 text-sm">
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
        <textarea name="observaciones" rows={3} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-600" />
      </div>

      <div className="flex items-start gap-2">
        <input type="checkbox" name="privacyAccepted" required className="mt-1" />
        <label className="text-xs text-slate-600">
          Acepto el aviso de privacidad y autorizo el uso de mis datos para efectos de afiliación.
        </label>
      </div>

      <div className="pt-1">
        <button
          disabled={submitting}
          className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-white text-sm font-medium shadow hover:bg-emerald-700 disabled:opacity-50"
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
        className={`mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-600 ${upper ? "uppercase tracking-wider" : ""}`}
      />
    </div>
  );
}
