// netlify/functions/auth.cjs
// Login Backoffice SITYPS (CommonJS)

const jwt = require('jsonwebtoken');

// Utilidades
const ok = (bodyObj, status = 200) => ({
  statusCode: status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
  body: JSON.stringify(bodyObj),
});

const err = (message, status = 400) => ok({ ok: false, error: message }, status);

// Normaliza JSON desde variable de entorno (a veces viene con comillas adicionales)
function parseAdminUsers(envValue) {
  if (!envValue) return [];
  let v = envValue.trim();
  try {
    // Si por algún motivo viene doblemente serializado, intenta dos veces
    let parsed = JSON.parse(v);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

// Genera email normalizado a partir de usuario o correo
function normalizeIdentity(raw, defaultDomain = 'sityps.org.mx') {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return { email: '', user: '' };
  if (s.includes('@')) {
    const [u, dom] = s.split('@');
    return { email: `${u}@${dom}`, user: u };
  }
  return { email: `${s}@${defaultDomain}`, user: s };
}

exports.handler = async (event) => {
  // Preflight
  if (event.httpMethod === 'OPTIONS') return ok({ ok: true });

  if (event.httpMethod !== 'POST') {
    return err('Method Not Allowed', 405);
  }

  if (!event.body) {
    return err('Faltan credenciales', 400);
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body);
  } catch {
    return err('JSON inválido', 400);
  }

  // Admite varios nombres de campo
  const rawId =
    payload.email ??
    payload.correo ??
    payload.user ??
    payload.usuario ??
    '';

  const password = payload.password ?? payload.pass ?? payload.contrasena ?? payload.contraseña ?? '';

  if (!rawId || !password) {
    return err('Faltan credenciales', 400);
  }

  // Cargar usuarios de entorno
  const admins = parseAdminUsers(process.env.ADMIN_USERS_JSON);
  if (!admins.length) {
    return err('Configuración de usuarios no disponible', 500);
  }

  // Dominios permitidos (si en un futuro usas otro, agrega aquí)
  const DEFAULT_DOMAIN = 'sityps.org.mx';

  // Normalizar identidad
  const { email, user } = normalizeIdentity(rawId, DEFAULT_DOMAIN);

  // Buscar usuario: por local-part o por email
  const found = admins.find((u) => {
    const local = String(u.user || '').toLowerCase();
    const fullEmail = (u.email ? String(u.email) : `${local}@${DEFAULT_DOMAIN}`).toLowerCase();
    return local === user || fullEmail === email;
  });

  if (!found) {
    // Usuario no existe
    return err('Usuario no autorizado', 401);
  }

  // Validar contraseña
  const rightPass = String(found.pass || '');
  if (rightPass !== String(password)) {
    return err('Usuario o contraseña incorrectos', 401);
  }

  // Emitir JWT
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
  const token = jwt.sign(
    {
      sub: found.user,
      email: `${found.user}@${DEFAULT_DOMAIN}`,
      role: found.role,
      displayName: found.displayName,
      puesto: found.puesto,
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  return ok({
    ok: true,
    token,
    user: {
      user: found.user,
      email: `${found.user}@${DEFAULT_DOMAIN}`,
      role: found.role,
      displayName: found.displayName,
      puesto: found.puesto,
    },
  });
};
