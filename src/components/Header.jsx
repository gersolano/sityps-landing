import React from "react";
import cfg from "../../sityps.config.json";
import { getToken, getCurrentUser, clearSession } from "../shared/api";

export default function Header() {
  const [open, setOpen] = React.useState(false);
  const route = useHashRoute();

  const token = getToken();
  const account = token ? (getCurrentUser() || null) : null;

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
    { text: "Backoffice", href: "#/backoffice" },
  ];

  const isHashLink = (href) => href.startsWith("#/");
  const isActive = (href) => isHashLink(href) && route === href.replace(/^#/, "");

  function onLogout() {
    clearSession();
    window.location.hash = "#/admin";
  }

  return (
    <header
      className="
        fixed top-0 inset-x-0 z-40 border-b
        bg-white md:bg-white/90 md:backdrop-blur-md supports-[backdrop-filter]:md:bg-white/70
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

        {/* Right side */}
        <div className="flex items-center gap-4">
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
                <a key={l.href} href={l.href} className="px-1 py-1 text-slate-700 hover:text-slate-900">
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

          {/* Desktop account (todas las rutas si hay sesión) */}
          {account ? (
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right leading-tight">
                <div className="text-sm font-medium text-slate-800">
                  {account.displayName || account.user || "Usuario"}
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <div className="text-xs text-slate-500">
                    {account.puesto || account.role || ""}
                  </div>
                  <RoleBadge role={account.role} />
                </div>
              </div>
              <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700">
                {(account.displayName || account.user || "U").slice(0, 1).toUpperCase()}
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-lg border px-3 py-2 text-sm"
                title="Cerrar sesión"
              >
                Salir
              </button>
            </div>
          ) : (
            <a
              href="#/admin"
              className="hidden md:inline-flex rounded-lg border px-3 py-2 text-sm"
              title="Iniciar sesión"
            >
              Entrar
            </a>
          )}

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
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Overlay (debajo del header) */}
      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 top-14 z-20 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer (con saludo/badge si hay sesión) */}
      <div
        className={`md:hidden fixed top-14 inset-x-0 z-30 bg-white border-t transition-transform duration-200 ${
          open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0 pointer-events-none"
        }`}
      >
        {account ? (
          <div className="px-4 pt-4 pb-2 border-b">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700">
                {(account.displayName || account.user || "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="leading-tight">
                <div className="text-sm font-medium text-slate-800">
                  {account.displayName || account.user || "Usuario"}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-slate-500">{account.puesto || account.role || ""}</div>
                  <RoleBadge role={account.role} />
                </div>
              </div>
              <button
                onClick={() => { setOpen(false); onLogout(); }}
                className="ml-auto rounded-lg border px-3 py-2 text-xs"
                title="Cerrar sesión"
              >
                Salir
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 pt-4 pb-2 border-b">
            <a
              href="#/admin"
              onClick={() => setOpen(false)}
              className="inline-flex rounded-lg border px-3 py-2 text-sm"
              title="Iniciar sesión"
            >
              Entrar
            </a>
          </div>
        )}

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
        </nav>
      </div>
    </header>
  );
}

/* Badge por rol */
function RoleBadge({ role }) {
  const meta = roleMeta(role);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.classes}`}>
      {meta.label}
    </span>
  );
}

function roleMeta(role) {
  const r = String(role || "").toLowerCase().trim();
  const map = {
    admin: { label: "Admin", classes: "bg-slate-100 text-slate-800 border-slate-200" },
    afiliacion: { label: "Afiliación", classes: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    demandas: { label: "Asuntos Laborales", classes: "bg-rose-100 text-rose-800 border-rose-200" },
    laborales: { label: "Asuntos Laborales", classes: "bg-rose-100 text-rose-800 border-rose-200" },
    finanzas: { label: "Finanzas", classes: "bg-amber-100 text-amber-800 border-amber-200" },
    formacion: { label: "Formación", classes: "bg-sky-100 text-sky-800 border-sky-200" },
    escalafon: { label: "Escalafón", classes: "bg-indigo-100 text-indigo-800 border-indigo-200" },
    prestaciones: { label: "Prestaciones", classes: "bg-teal-100 text-teal-800 border-teal-200" },
    prensa: { label: "Prensa", classes: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200" },
    cultura: { label: "Cultura/Deporte", classes: "bg-purple-100 text-purple-800 border-purple-200" },
    "deporte-cultura": { label: "Deporte/Cultura", classes: "bg-violet-100 text-violet-800 border-violet-200" },
    equidad: { label: "Mujer y Equidad", classes: "bg-pink-100 text-pink-800 border-pink-200" },
    "honor-justicia": { label: "Honor y Justicia", classes: "bg-gray-100 text-gray-800 border-gray-200" },
    electoral: { label: "Electoral", classes: "bg-orange-100 text-orange-800 border-orange-200" },
    consultorios: { label: "Consultorios", classes: "bg-lime-100 text-lime-800 border-lime-200" },
    soporte: { label: "Soporte", classes: "bg-zinc-100 text-zinc-800 border-zinc-200" },
    "region-tuxtepec": { label: "Región Tuxtepec", classes: "bg-cyan-100 text-cyan-800 border-cyan-200" },
    "region-pochutla": { label: "Región Pochutla", classes: "bg-cyan-100 text-cyan-800 border-cyan-200" },
    "region-valle-centrales": { label: "Región Valles Centrales", classes: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  };
  return map[r] || { label: r || "Rol", classes: "bg-slate-100 text-slate-800 border-slate-200" };
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
