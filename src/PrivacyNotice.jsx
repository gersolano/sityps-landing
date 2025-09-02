// src/PrivacyNotice.jsx
import React from "react";
import cfg from "../sityps.config.json";

export default function PrivacyNotice() {
  const today = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header compacta */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={cfg.site?.logo || "/logo.svg"} alt="SITYPS" className="h-7 w-auto"
                 onError={(e)=>{e.currentTarget.style.display="none";}} />
            <span className="text-lg font-semibold text-slate-800">{cfg.site?.name || "SITYPS"}</span>
          </div>
          <a href="#/" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Volver al inicio</a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Aviso de Privacidad</h1>
        <p className="mt-2 text-slate-600">Última actualización: {today}</p>

        <section className="mt-6 space-y-8">
          <Block title="Identidad y domicilio del responsable">
            <p className="text-slate-700">
              {cfg.site?.name || "SITYPS"} (en lo sucesivo, “el Sindicato”), con domicilio en {cfg.contact?.address},
              es responsable del tratamiento de sus datos personales que sean recabados a través del presente sitio con fines de
              <b> preafiliación</b>.
            </p>
          </Block>

          <Block title="Datos personales recabados">
            <p className="text-slate-700">Para iniciar el trámite de preafiliación solicitamos, de forma enunciativa, los siguientes datos:</p>
            <ul className="list-disc pl-5 text-slate-700 space-y-1">
              <li>Identificación: nombre completo, CURP, RFC, NSS.</li>
              <li>Contacto: teléfono y correo electrónico.</li>
              <li>Laborales: empresa/institución, sección, domicilio, municipio y estado.</li>
              <li>Observaciones que usted desee proporcionar.</li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              No se solicitan datos personales sensibles a través de este formulario. Si por alguna razón usted los incluye,
              el Sindicato los tratará bajo mayores medidas de seguridad y confidencialidad.
            </p>
          </Block>

          <Block title="Finalidades del tratamiento">
            <ul className="list-disc pl-5 text-slate-700 space-y-1">
              <li>Identificarle y dar trámite a su solicitud de preafiliación.</li>
              <li>Contactarle para integrar expediente y verificar requisitos.</li>
              <li>Gestionar el proceso interno de afiliación y, en su caso, formalizar su alta.</li>
              <li>Atender aclaraciones o solicitudes relacionadas con el proceso.</li>
            </ul>
          </Block>

          <Block title="Fundamento legal">
            <p className="text-slate-700">
              El tratamiento se realiza conforme a la legislación mexicana aplicable, incluyendo la Ley Federal de Protección de Datos Personales en
              Posesión de los Particulares y su Reglamento.
            </p>
          </Block>

          <Block title="Transferencias y encargados">
            <p className="text-slate-700">
              Sus datos podrán ser compartidos de manera interna con las áreas del Sindicato que intervienen en el proceso de afiliación.
              Asimismo, podrán realizarse transferencias sin requerir consentimiento en los casos previstos por ley, por ejemplo, a autoridades
              competentes que lo requieran. No realizamos transferencias con fines comerciales o de mercadotecnia.
            </p>
          </Block>

          <Block title="Conservación y seguridad">
            <p className="text-slate-700">
              Conservamos la información únicamente por el tiempo necesario para cumplir las finalidades señaladas y las obligaciones legales aplicables.
              Implementamos medidas administrativas, técnicas y físicas razonables para proteger sus datos contra pérdida, uso indebido o acceso no autorizado.
            </p>
          </Block>

          <Block title="Derechos ARCO y medios de contacto">
            <p className="text-slate-700">
              Usted puede ejercer sus derechos de Acceso, Rectificación, Cancelación u Oposición (ARCO), así como revocar su consentimiento o limitar el uso
              de sus datos, enviando una solicitud al correo <a className="text-emerald-700 underline" href={`mailto:${cfg.contact?.email}`}>{cfg.contact?.email}</a>
              {" "}o por escrito en el domicilio indicado. Para atender su petición, describa claramente el derecho que desea ejercer y adjunte identificación oficial.
            </p>
            <p className="mt-2 text-slate-700">
              También puede contactarnos al teléfono {cfg.contact?.phone}.
            </p>
          </Block>

          <Block title="Uso de cookies">
            <p className="text-slate-700">
              Este sitio puede utilizar cookies técnicas para su correcto funcionamiento. Puede controlarlas desde la configuración de su navegador.
              No utilizamos cookies con fines de publicidad personalizada.
            </p>
          </Block>

          <Block title="Actualizaciones del aviso">
            <p className="text-slate-700">
              Cualquier cambio material a este Aviso se publicará en esta misma dirección electrónica. Le recomendamos revisarlo periódicamente.
            </p>
          </Block>
        </section>

        <div className="mt-8">
          <a href="#/" className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-white text-sm hover:bg-emerald-700">
            Volver al inicio
          </a>
        </div>
      </main>

      <footer className="py-10 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {cfg.site?.name || "SITYPS"} — Todos los derechos reservados.
      </footer>
    </div>
  );
}

function Block({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}
