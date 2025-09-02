import React from "react";
import cfg from "../../sityps.config.json";

export default function PrivacyNotice() {
  const today = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Aviso de Privacidad</h1>
      <p className="mt-2 text-slate-600">Última actualización: {today}</p>
      <section className="mt-6 space-y-6">
        <Block title="Identidad y domicilio del responsable">
          <p className="text-slate-700">
            {cfg.site?.name || "SITYPS"}, con domicilio en {cfg.contact?.address}, es responsable del tratamiento
            de sus datos personales recabados con fines de <b>preafiliación</b>.
          </p>
        </Block>
        <Block title="Datos personales recabados">
          <ul className="list-disc pl-5 text-slate-700 space-y-1">
            <li>Identificación: nombre completo, CURP, RFC, NSS.</li>
            <li>Contacto: teléfono y correo electrónico.</li>
            <li>Laborales: empresa/institución, sección, domicilio, municipio y estado.</li>
            <li>Observaciones que usted desee proporcionar.</li>
          </ul>
        </Block>
        <Block title="Finalidades del tratamiento">
          <ul className="list-disc pl-5 text-slate-700 space-y-1">
            <li>Dar trámite a su solicitud de preafiliación y contactarle.</li>
            <li>Integrar expediente y verificar requisitos.</li>
            <li>Gestionar el proceso de afiliación y, en su caso, formalizar su alta.</li>
          </ul>
        </Block>
        <Block title="Fundamento legal">
          <p className="text-slate-700">
            Ley Federal de Protección de Datos Personales en Posesión de los Particulares y su Reglamento.
          </p>
        </Block>
        <Block title="Transferencias y encargados">
          <p className="text-slate-700">
            Podemos compartir internamente con áreas del Sindicato involucradas. Transferencias sin consentimiento
            se realizarán solo en los casos previstos por ley (p.ej., autoridades competentes).
          </p>
        </Block>
        <Block title="Conservación y seguridad">
          <p className="text-slate-700">
            Conservamos la información el tiempo necesario para cumplir las finalidades y obligaciones legales, con medidas
            administrativas, técnicas y físicas razonables de seguridad.
          </p>
        </Block>
        <Block title="Derechos ARCO y contacto">
          <p className="text-slate-700">
            Para ejercer Acceso, Rectificación, Cancelación u Oposición (ARCO), revocar el consentimiento o limitar el uso de
            sus datos, escriba a <a className="text-primary-700 underline" href={`mailto:${cfg.contact?.email}`}>{cfg.contact?.email}</a>
            {" "}o en el domicilio indicado. Adjunte identificación y detalle su solicitud.
          </p>
          <p className="text-slate-700 mt-1">Teléfono: {cfg.contact?.phone}</p>
        </Block>
        <Block title="Uso de cookies">
          <p className="text-slate-700">
            Este sitio puede utilizar cookies técnicas necesarias. Puede controlarlas desde su navegador. No usamos cookies con fines publicitarios.
          </p>
        </Block>
        <Block title="Actualizaciones del aviso">
          <p className="text-slate-700">Cualquier cambio se publicará en esta misma dirección electrónica.</p>
        </Block>
      </section>
      <div className="mt-8">
        <a href="#/" className="inline-flex items-center rounded-xl bg-primary-600 px-4 py-2 text-white text-sm hover:bg-primary-700">
          Volver al inicio
        </a>
      </div>
    </main>
  );
}

function Block({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}
