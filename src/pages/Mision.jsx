import React from "react";
import cfg from "../../sityps.config.json";

export default function Mision() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Misión y Visión</h1>
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <Card title="Misión">
          <p className="text-slate-700">{cfg.content?.mission}</p>
        </Card>
        <Card title="Visión">
          <p className="text-slate-700">{cfg.content?.vision}</p>
        </Card>
      </div>
    </main>
  );
}
function Card({ title, children }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
    <div className="text-base font-semibold mb-2">{title}</div>{children}
  </div>;
}
