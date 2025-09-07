// netlify/functions/auth.cjs
const jwt = require("jsonwebtoken");

const DEFAULT_DOMAIN = process.env.DEFAULT_LOGIN_DOMAIN || "sityps.org.mx";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

/** Normaliza correo: si viene "soporte" => "soporte@sityps.org.mx" */
function normEmail(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "";
  return s.includes("@") ? s : `${s}@${DEFAULT_DOMAIN}`;
}

/** Carga usuarios de ADMIN_USERS_JSON; acepta objeto o arreglo */
function loadUsers() {
  const raw = process.env.ADMIN_USERS_JSON || "{}";
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }
  /** Formato unificado: [{ email, name, role, puesto, modulo, pass }] */
  if (Array.isArray(parsed)) {
    return parsed.map((u) => ({
      email: (u.email || u.correo || "").toLowerCase(),
      name: u.name || u.nombre || u.displayName || "",
      role: u.role || u.rol || "",
      puesto: u.puesto || "",
      modulo: u.modulo || u.department || "",
      pass: u.pass || u.password || "",
    }));
  }
  // objeto { "email": { ... } }
  return Object.entries(parsed).map(([email, u]) => ({
    email: email.toLowerCase(),
    name: u.name || u.nombre || u.displayName || "",
    role: u.role || u.rol || "",
    puesto: u.puesto || "",
    modulo: u.modulo || u.department || "",
    pass: u.pass || u.password || "",
  }));
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, error: "Method Not Allowed" }),
    };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch (_) {}

  const emailRaw =
    body.email || body.correo || body.user || body.usuario || body.username || "";
  const password =
    body.password || body.pass || body.contrasena || body["contraseña"] || "";

  if (!emailRaw || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, message: "Faltan credenciales" }),
    };
  }

  const email = normEmail(emailRaw);
  const users = loadUsers();
  const u = users.find((x) => x.email === email);

  if (!u) {
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Usuario no autorizado" }) };
  }

  const generic = process.env.ADMIN_PASSWORD || "";
  const expectedPass = u.pass || generic;

  if (!expectedPass || password !== expectedPass) {
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Contraseña inválida" }) };
  }

  const payload = {
    sub: email,
    name: u.name || email.split("@")[0],
    role: u.role || "soporte",
    puesto: u.puesto || "",
    modulo: u.modulo || "",
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, token, user: payload }),
  };
};
