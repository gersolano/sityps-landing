import React from "react";
import cfg from "../../sityps.config.json";

export default function Logros() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Gestiones y Logros</h1>
      <ul className="list-disc pl-5 space-y-1 text-slate-700 mt-6">
        {(cfg.content?.achievements || []).map((li, i) => <li key={i}>{li}</li>)}
      </ul>
    </main>
  );
}
