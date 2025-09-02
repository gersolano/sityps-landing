import React from "react";
import cfg from "../../sityps.config.json";

export default function Directorio() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Directorio</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {(cfg.directory?.comiteEjecutivo || []).map(([name, role]) => (
          <div key={name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="font-semibold text-slate-800">{name}</div>
            <div className="text-sm text-slate-600">{role}</div>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4 mt-6">
        {(cfg.directory?.organos || []).map(([org, head]) => (
          <div key={org} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="font-semibold text-slate-800">{org}</div>
            <div className="text-sm text-slate-600">{head}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
