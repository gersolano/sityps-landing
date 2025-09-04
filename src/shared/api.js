// src/shared/api.js
export function getToken() {
  return localStorage.getItem("sityps_token") || "";
}
export function setToken(t) {
  localStorage.setItem("sityps_token", t || "");
}
export function clearToken() {
  localStorage.removeItem("sityps_token");
}
export function setCurrentUser(u) {
  localStorage.setItem("sityps_user", JSON.stringify(u || {}));
}
export function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem("sityps_user") || "{}"); }
  catch { return {}; }
}
export function clearCurrentUser() {
  localStorage.removeItem("sityps_user");
}

export function setSession({ token, user, role, displayName, puesto }) {
  setToken(token);
  setCurrentUser({ user, role, displayName, puesto });
}
export function clearSession() {
  clearToken();
  clearCurrentUser();
}

export async function login(user, pass) {
  const r = await fetch("/.netlify/functions/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, pass }),
  });
  if (!r.ok) throw new Error("Credenciales inválidas");
  return r.json(); // { ok, token, user, role, displayName, puesto }
}

export async function listTickets(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(`/.netlify/functions/tickets?${qs}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!r.ok) throw new Error("No autorizado");
  return r.json();
}

export async function getTicket(folio) {
  const r = await fetch(`/.netlify/functions/tickets?folio=${encodeURIComponent(folio)}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!r.ok) throw new Error("No autorizado");
  return r.json();
}

export async function updateTicket(folio, patch) {
  const r = await fetch(`/.netlify/functions/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ folio, patch }),
  });
  if (!r.ok) throw new Error("No autorizado");
  return r.json();
}
