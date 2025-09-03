import React from "react";
import cfg from "../../sityps.config.json";

export default function Header() {
  const [open, setOpen] = React.useState(false);
  const route = useHashRoute();

  const links = [
    { text: "Inicio", href: "#/" },
    { text: "Misión", href: "#/mision" },
    { text: "Principios", href: "#/principios" },
    { text: "Logros", href: "#/logros" },
    { text: "Servicios", href: "#/servicios" },
    { text: "Derechos", href: "#/derechos" },
    { text: "Directorio", href: "#/directorio" },
    { text: "Contacto", href: "#/contacto" },
    { text: "Asistencia", href: "#/asistencia" },
    { text: "Aviso de privacidad", href: cfg.site?.privacyUrl || "#/aviso-privacidad" },
  ];

  const isHashLink = (href) => href.startsWith("#/");
  const isActive = (href) => isHashLink(href) && route === href.replace(/^#/, "");

  return (
    <header
      className="
        fixed top-0 inset-x-0 z-40 border-b
        bg-white
        md:bg-white/90 md:backdrop-blur-md supports-[backdrop-filter]:md:bg-white/70
        shadow-sm
      "
    >
      <div className="mx-auto max-w-6xl px-4 h-14 md:h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <a href="#/" className="flex items-center gap-3 shrink-0">
          <img src="/logo.png" alt="SITYPS" className="h-10 w-auto" />
          <span className="text-lg font-semibold tracking-tight text-slate-800">
            SINDICATO SITYPS
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-5 text-sm">
          {links.map((l) =>
            isHashLink(l.href) ? (
              <a
                key={l.href}
                href={l.href}
                className={`px-1 py-1 ${
                  isActive(l.href)
                    ? "text-primary-700 font-medium underline underline-offset-4"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                {l.text}
              </a>
            ) : (
              <a
                key={l.href}
                href={l.href}
                className="px-1 py-1 text-slate-700 hover:text-slate-900"
              >
                {l.text}
              </a>
            )
          )}
          <a
            href="#/preafiliacion"
            className="rounded-lg bg-primary-600 text-white px-4 py-2 hover:bg-primary-700"
          >
            Preafiliación
          </a>
        </nav>

        {/* Mobile actions */}
        <div className="md:hidden flex items-center gap-2">
          <a
            href="#/preafiliacion"
            className="rounded-lg bg-primary-600 text-white px-3 py-2 text-sm"
          >
            Preafiliación
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menú"
            aria-expanded={open}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white"
          >
            {!open ? (
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Overlay (debajo del header, encima del contenido) */}
      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 top-14 z-20 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer (debajo del header) */}
      <div
        className={`md:hidden fixed top-14 inset-x-0 z-30 bg-white border-t transition-transform duration-200 ${
          open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0 pointer-events-none"
        }`}
      >
        <nav className="mx-auto max-w-6xl px-4 py-4 grid gap-2 text-base">
          {links.map((l) =>
            isHashLink(l.href) ? (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2 ${
                  isActive(l.href)
                    ? "bg-primary-50 text-primary-700 font-medium"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {l.text}
              </a>
            ) : (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50"
              >
                {l.text}
              </a>
            )
          )}
          <a
            href="#/preafiliacion"
            onClick={() => setOpen(false)}
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary-600 text-white px-4 py-2 hover:bg-primary-700"
          >
            Preafiliación
          </a>
        </nav>
      </div>
    </header>
  );
}

/* Hook para saber la ruta actual (#/ruta) y resaltar activo */
function useHashRoute() {
  const get = () => (window.location.hash.replace(/^#/, "") || "/");
  const [route, setRoute] = React.useState(get);
  React.useEffect(() => {
    const onHash = () => setRoute(get());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route.startsWith("/") ? route : `/${route}`;
}
