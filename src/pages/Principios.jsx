import React from "react";
import cfg from "../../sityps.config.json";

export default function Principios() {
  const Pill = ({ children }) =>
    <span className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700">{children}</span>;
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Principios y Valores</h1>
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <Card title="Principios">
          <div className="flex flex-wrap gap-2">
            {(cfg.content?.principles || []).map(p => <Pill key={p}>{p}</Pill>)}
          </div>
        </Card>
        <Card title="Valores">
          <div className="flex flex-wrap gap-2">
            {(cfg.content?.values || []).map(v => <Pill key={v}>{v}</Pill>)}
          </div>
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
