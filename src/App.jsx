// src/App.jsx
import React from "react";
import SITYPSLanding from "./SITYPSLanding";
import PrivacyNotice from "./PrivacyNotice";

function useHashRoute() {
  const [hash, setHash] = React.useState(() => window.location.hash.replace(/^#/, ""));
  React.useEffect(() => {
    const h = () => setHash(window.location.hash.replace(/^#/, ""));
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  // normaliza: "#/aviso-privacidad" -> "/aviso-privacidad"
  return hash.startsWith("/") ? hash : `/${hash}`;
}

export default function App() {
  const route = useHashRoute();
  if (route === "/aviso-privacidad") return <PrivacyNotice />;
  // por defecto: landing
  return <SITYPSLanding />;
}
