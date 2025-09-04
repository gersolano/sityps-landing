import React, { useState } from "react";
import { login, setSession } from "../shared/api";

export default function Admin() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      const res = await login(user.trim(), pass);
      if (res?.ok && res.token) {
        setSession(res);
        window.location.hash = "#/backoffice";
      } else {
        setErr("No se pudo iniciar sesión");
      }
    } catch (e) {
      setErr("Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4">
      <h1 className="mt-6 mb-3 text-2xl font-semibold text-slate-800">Acceso Backoffice</h1>
      {err && <div className="mb-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 text-sm">{err}</div>}
      <form onSubmit={onSubmit} className="grid gap-3">
        <div>
          <label className="text-xs text-slate-600">Usuario</label>
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                 value={user} onChange={(e)=>setUser(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="text-xs text-slate-600">Contraseña</label>
          <input type="password" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                 value={pass} onChange={(e)=>setPass(e.target.value)} />
        </div>
        <button disabled={loading}
                className="mt-1 inline-flex items-center justify-center rounded-lg bg-primary-600 text-white px-4 py-2 text-sm hover:bg-primary-700 disabled:opacity-50">
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
