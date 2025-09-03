import React from "react";
import TicketForm from "../shared/TicketForm";

export default function Asistencia() {
  return (
    <main>
      <section className="relative">
        <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
          <div className="mx-auto max-w-6xl px-4 py-10 text-white">
            <div className="flex items-center gap-6">
              <img src="/logo.png" alt="SITYPS" className="h-28 w-auto" />
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                  Mesa de Asistencia
                </h1>
                <p className="mt-2 text-white/90">
                  ¿Tienes una solicitud o problema? Registra tu ticket y el equipo correspondiente te atenderá.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 -mt-8 pb-10">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-card">
          <div className="p-4 md:p-6">
            <TicketForm />
          </div>
        </div>
      </section>
    </main>
  );
}
