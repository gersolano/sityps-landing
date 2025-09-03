import React from "react";
import cfg from "../sityps.config.json";
import Header from "./components/Header";

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
import Asistencia from "./pages/Asistencia";

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

/* Transición suave entre páginas */
function Fade({ route, children }) {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setShow(true), 10);
    return () => clearTimeout(t);
  }, [route]);
  return (
    <div className={`transition-opacity duration-300 ${show ? "opacity-100" : "opacity-0"}`}>
      {children}
    </div>
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
  else if (route === "/asistencia") Page = Asistencia;

  return (
    {/* pt-16 = 64px (≈ h-14), md:pt-20 = 80px (≈ h-16) */}
    <div className="min-h-screen bg-slate-50 pt-16 md:pt-20">
      <Header />
      <Fade route={route}>
        <Page />
      </Fade>
      <footer className="py-10 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {cfg.site?.name || "SITYPS"} — Todos los derechos reservados.
      </footer>
    </div>
  );
}
