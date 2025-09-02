import React from "react";

export default function Derechos() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Derechos y Obligaciones</h1>
      <div className="grid md:grid-cols-2 gap-6 mt-6">
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
      <p className="mt-4 text-xs text-slate-500">Consulta el detalle en Estatutos del SITYPS.</p>
    </main>
  );
}
function Card({ title, children }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
    <div className="text-base font-semibold mb-2">{title}</div>{children}
  </div>;
}
