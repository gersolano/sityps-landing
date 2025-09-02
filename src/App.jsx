import React from "react";
import cfg from "../sityps.config.json";
import Home from "./pages/Home";
import Mision from "./pages/Mision";
import Principios from "./pages/Principios";
import Logros from "./pages/Logros";
import Servicios from "./pages/Servicios";
import Derechos from "./pages/Derechos";
import Directorio from "./pages/Directorio";
import Contacto from "./pages/Contacto";
import Aviso from "./pages/PrivacyNotice";
import Preafiliacion from "./pages/Preafiliacion";

/* Router por hash */
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

/* Transición */
function Fade({ route, children }) {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(() => setShow(true), 10); return () => clearTimeout(t); }, [route]);
  return <div className={`transition-opacity duration-300 ${show ? "opacity-100" : "opacity-0"}`}>{children}</div>;
}

function Header() {
  const links = [
    ["Inicio", "#/"],
    ["Misión", "#/mision"],
    ["Principios", "#/principios"],
    ["Logros", "#/logros"],
    ["Servicios", "#/servicios"],
    ["Derechos", "#/derechos"],
    ["Directorio", "#/directorio"],
    ["Contacto", "#/contacto"],
    ["Aviso de privacidad", cfg.site?.privacyUrl || "#/aviso-privacidad"],
  ];
  return (
    <header className="border-b bg-white sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <a href="#/" className="flex items-center gap-3 shrink-0">
          <img src="/logo.png" alt="SITYPS" className="h-10 w-auto" />
          <span className="text-lg font-semibold tracking-tight text-slate-800">SITYPS</span>
        </a>
        <nav className="hidden md:flex items-center gap-5 text-sm">
          {links.map(([t, h]) => <a key={h} href={h} className="text-slate-700 hover:text-slate-900">{t}</a>)}
          <a href="#/preafiliacion" className="rounded-lg bg-primary-600 text-white px-4 py-2 hover:bg-primary-700">
            Preafiliación
          </a>
        </nav>
        <div className="md:hidden flex items-center gap-2">
          <a href="#/preafiliacion" className="rounded-lg bg-primary-600 text-white px-3 py-2 text-sm">Preafiliación</a>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const route = useHashRoute();
  let Page = Home;
  if (route === "/mision") Page = Mision;
  else if (route === "/principios") Page = Principios;
  else if (route === "/logros") Page = Logros;
  else if (route === "/servicios") Page = Servicios;
  else if (route === "/derechos") Page = Derechos;
  else if (route === "/directorio") Page = Directorio;
  else if (route === "/contacto") Page = Contacto;
  else if (route === "/aviso-privacidad") Page = Aviso;
  else if (route === "/preafiliacion") Page = Preafiliacion;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <Fade route={route}><Page /></Fade>
      <footer className="py-10 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {cfg.site?.name || "SITYPS"} — Todos los derechos reservados.
      </footer>
    </div>
  );
}
