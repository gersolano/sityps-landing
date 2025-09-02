import React from "react";
import cfg from "../../sityps.config.json";

export default function Contacto() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Contacto</h1>
      <div className="grid md:grid-cols-3 gap-6 mt-6">
        <Card title="Dirección"><p className="text-slate-700">{cfg.contact?.address}</p></Card>
        <Card title="Teléfono / Correo">
          <p className="text-slate-700">{cfg.contact?.phone}</p>
          <p className="text-slate-700">{cfg.contact?.email}</p>
        </Card>
        <Card title="Redes">
          <p className="text-slate-700">Facebook: {cfg.contact?.social?.facebook}</p>
          <p className="text-slate-700">TikTok: {cfg.contact?.social?.tiktok}</p>
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
