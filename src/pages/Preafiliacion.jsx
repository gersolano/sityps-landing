import React from "react";
import PreafiliacionForm from "../shared/PreafiliacionForm";

export default function Preafiliacion() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h1 className="text-xl font-semibold">Preafiliación</h1>
          <p className="text-xs text-slate-600">Esta solicitud se envía por correo al área de <b>Afiliación</b> para iniciar el trámite.</p>
        </div>
        <PreafiliacionForm />
      </section>
    </main>
  );
}
