// netlify/functions/auth.cjs
const jwt = require("jsonwebtoken");

function j(code, ok, message, extra = {}) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ ok, message, ...extra }),
  };
}

function loadUsers() {
  const json = process.env.ADMIN_USERS_JSON;
  if (json) {
    try {
      const arr = JSON.parse(json);
      if (Array.isArray(arr) && arr.length) return arr;
    } catch {}
  }
  const u = process.env.ADMIN_USER;
  const p = process.env.ADMIN_PASS;
  const r = process.env.ADMIN_ROLE || "admin";
  const n = process.env.ADMIN_DISPLAY_NAME || u || "Usuario";
  const puesto = process.env.ADMIN_PUESTO || r;

  return (u && p)
    ? [{ user: u, pass: p, role: r, displayName: n, puesto }]
    : [];
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return j(405, false, "Method Not Allowed");
  if (!process.env.JWT_SECRET) return j(500, false, "JWT no configurado");

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch {}
  const { user = "", pass = "" } = body;
  if (!user || !pass) return j(400, false, "Faltan credenciales");

  const users = loadUsers();
  const found = users.find(u => u.user === user && u.pass === pass);
  if (!found) return j(401, false, "Credenciales inválidas");

  const payload = {
    sub: found.user,
    role: found.role,
    displayName: found.displayName || found.user,
    puesto: found.puesto || found.role
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "8h" });

  return j(200, true, "OK", {
    token,
    user: payload.sub,
    role: payload.role,
    displayName: payload.displayName,
    puesto: payload.puesto
  });
};
