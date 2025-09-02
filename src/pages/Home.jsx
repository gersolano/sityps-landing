import React from "react";
import cfg from "../../sityps.config.json";

export default function Home() {
  return (
    <main>
      {/* Hero rojo oscuro (texto en blanco, sin desvanecer) */}
      <section className="relative">
        <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
          <div className="mx-auto max-w-6xl px-4 py-12 text-white">
            <div className="flex items-center gap-6">
              {/* Logo ~3.5cm de alto */}
              <img src="/logo.png" alt="SITYPS" className="h-32 w-auto" />
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                  SINDICATO INDEPENDIENTE DE TRABAJADORES Y PROFESIONALES EN SALUD (SITYPS)
                </h1>
                {cfg.site?.motto && (
                  <p className="mt-2 text-white/90 font-medium">{cfg.site.motto}</p>
                )}
              </div>
            </div>

            <p className="mt-6 max-w-3xl text-white/90">
              Bienvenidas y bienvenidos al sitio oficial del SITYPS. Somos una organización
              democrática al servicio de las y los trabajadores del sector salud,
              pública y privadamente.
            </p>

            <div className="mt-6 flex gap-3">
              <a
                href="#/preafiliacion"
                className="rounded-lg bg-white text-primary-800 px-5 py-2 text-sm font-semibold hover:bg-primary-50"
              >
                Iniciar preafiliación
              </a>
              <a
                href="#/mision"
                className="rounded-lg border border-white/60 px-5 py-2 text-sm text-white hover:bg-white/10"
              >
                Conoce nuestra misión
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Tarjetas ilustrativas (reemplaza las imágenes cuando gustes) */}
      <section className="mx-auto max-w-6xl px-4 -mt-8 pb-10">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Afiliación",
              img: "/img/afiliacion.jpg",
              text: "Acompañamiento y defensa de tus derechos.",
            },
            {
              title: "Consultorios",
              img: "/img/consultorios.jpg",
              text: "Servicios médico-odontológicos por convenios.",
            },
            {
              title: "Gestiones",
              img: "/img/gestiones.jpg",
              text: "Resultados reales, con transparencia.",
            },
          ].map((c) => (
            <article
              key={c.title}
              className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-card"
            >
              <div className="h-40 bg-slate-100">
                <img
                  src={c.img}
                  alt={c.title}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{c.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{c.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
